import { TrendingDown, TrendingUp, Loader2 } from 'lucide-react';
import { useEffect, useState, useMemo } from 'react';
import { geoPath, geoNaturalEarth1 } from 'd3-geo';
import * as topojson from 'topojson-client';
import type { Topology, GeometryCollection } from 'topojson-specification';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useDemoMode } from '../context/DemoModeContext';
import { fetchLoginsByCountry, type CountryStat } from '../services/api';
import { mockCountryStats } from '../data/mockData';

// Empty country data for non-authenticated state
const emptyCountryUsers: Record<string, number> = {};

// ISO 2-letter to 3-letter code mapping
const iso2to3: Record<string, string> = {
  US: 'USA', GB: 'GBR', CA: 'CAN', AU: 'AUS', DE: 'DEU', FR: 'FRA', ES: 'ESP',
  IT: 'ITA', JP: 'JPN', CN: 'CHN', IN: 'IND', BR: 'BRA', MX: 'MEX', KR: 'KOR',
  RU: 'RUS', NL: 'NLD', SE: 'SWE', NO: 'NOR', DK: 'DNK', FI: 'FIN', PL: 'POL',
  TR: 'TUR', TH: 'THA', PK: 'PAK', PH: 'PHL', ID: 'IDN', MY: 'MYS', SG: 'SGP',
  VN: 'VNM', AR: 'ARG', CL: 'CHL', CO: 'COL', ZA: 'ZAF', EG: 'EGY', NG: 'NGA',
  KE: 'KEN', IL: 'ISR', AE: 'ARE', SA: 'SAU', NZ: 'NZL', IE: 'IRL', PT: 'PRT',
  CH: 'CHE', AT: 'AUT', BE: 'BEL', CZ: 'CZE', GR: 'GRC', HU: 'HUN', RO: 'ROU',
  UA: 'UKR',
};

// Get fill color based on user count and theme
const getCountryFill = (countryCode: string, countryData: Record<string, number>, maxCount: number, isDark: boolean) => {
  const users = countryData[countryCode] || 0;
  if (users === 0) {
    return isDark ? 'hsl(220 8% 20%)' : 'hsl(220 8% 88%)';
  }
  const intensity = maxCount > 0 ? Math.min(users / maxCount, 1) : 0;

  if (isDark) {
    const lightness = 30 + intensity * 35;
    const saturation = 40 + intensity * 50;
    return `hsl(210 ${saturation}% ${lightness}%)`;
  } else {
    const lightness = 65 - intensity * 30;
    const saturation = 50 + intensity * 40;
    return `hsl(210 ${saturation}% ${lightness}%)`;
  }
};

interface CountryFeature {
  type: 'Feature';
  id: string;
  properties: { name: string };
  geometry: GeoJSON.Geometry;
}

// Map numeric IDs to ISO alpha-3 codes
const idToCode: Record<string, string> = {
  '4': 'AFG', '8': 'ALB', '12': 'DZA', '24': 'AGO', '32': 'ARG',
  '36': 'AUS', '40': 'AUT', '50': 'BGD', '56': 'BEL', '76': 'BRA',
  '100': 'BGR', '104': 'MMR', '116': 'KHM', '120': 'CMR', '124': 'CAN',
  '152': 'CHL', '156': 'CHN', '170': 'COL', '180': 'COD', '188': 'CRI',
  '191': 'HRV', '192': 'CUB', '203': 'CZE', '208': 'DNK', '218': 'ECU',
  '818': 'EGY', '222': 'SLV', '231': 'ETH', '246': 'FIN', '250': 'FRA',
  '276': 'DEU', '288': 'GHA', '300': 'GRC', '320': 'GTM', '332': 'HTI',
  '340': 'HND', '348': 'HUN', '356': 'IND', '360': 'IDN', '364': 'IRN',
  '368': 'IRQ', '372': 'IRL', '376': 'ISR', '380': 'ITA', '392': 'JPN',
  '400': 'JOR', '398': 'KAZ', '404': 'KEN', '408': 'PRK', '410': 'KOR',
  '414': 'KWT', '418': 'LAO', '422': 'LBN', '430': 'LBR', '434': 'LBY',
  '458': 'MYS', '466': 'MLI', '484': 'MEX', '496': 'MNG', '504': 'MAR',
  '508': 'MOZ', '524': 'NPL', '528': 'NLD', '554': 'NZL', '558': 'NIC',
  '562': 'NER', '566': 'NGA', '578': 'NOR', '586': 'PAK', '591': 'PAN',
  '598': 'PNG', '600': 'PRY', '604': 'PER', '608': 'PHL', '616': 'POL',
  '620': 'PRT', '630': 'PRI', '634': 'QAT', '642': 'ROU', '643': 'RUS',
  '682': 'SAU', '686': 'SEN', '688': 'SRB', '694': 'SLE', '702': 'SGP',
  '703': 'SVK', '704': 'VNM', '705': 'SVN', '706': 'SOM', '710': 'ZAF',
  '724': 'ESP', '144': 'LKA', '729': 'SDN', '740': 'SUR', '752': 'SWE',
  '756': 'CHE', '760': 'SYR', '764': 'THA', '788': 'TUN', '792': 'TUR',
  '800': 'UGA', '804': 'UKR', '784': 'ARE', '826': 'GBR', '840': 'USA',
  '858': 'URY', '860': 'UZB', '862': 'VEN', '887': 'YEM', '894': 'ZMB',
  '716': 'ZWE',
};

export function WorldMap() {
  const { theme } = useTheme();
  const { isAuthenticated } = useAuth();
  const { isDemoMode } = useDemoMode();
  const isDark = theme === 'dark';
  const [countries, setCountries] = useState<CountryFeature[]>([]);
  const [loginData, setLoginData] = useState<CountryStat[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Use mock data in demo mode
  const showDemoIndicator = isDemoMode && !isAuthenticated;

  useEffect(() => {
    import('world-atlas/countries-110m.json').then((worldData) => {
      const topology = worldData.default as unknown as Topology<{ countries: GeometryCollection }>;
      const countriesGeo = topojson.feature(
        topology,
        topology.objects.countries
      ) as unknown as GeoJSON.FeatureCollection;

      setCountries(countriesGeo.features as CountryFeature[]);
    });
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      setLoginData([]);
      return;
    }

    setIsLoading(true);
    fetchLoginsByCountry(30)
      .then(setLoginData)
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [isAuthenticated]);

  const pathGenerator = useMemo(() => {
    const projection = geoNaturalEarth1()
      .scale(145)
      .translate([400, 180]);
    return geoPath(projection);
  }, []);

  // Use mock data in demo mode
  const displayLoginData = showDemoIndicator ? mockCountryStats : loginData;

  // Convert login data to country code map
  const countryData = useMemo(() => {
    if (!isAuthenticated && !isDemoMode) {
      return emptyCountryUsers;
    }
    if (displayLoginData.length === 0) {
      return emptyCountryUsers;
    }
    const data: Record<string, number> = {};
    for (const stat of displayLoginData) {
      const code3 = iso2to3[stat.country] || stat.country;
      data[code3] = stat.count;
    }
    return data;
  }, [isAuthenticated, isDemoMode, displayLoginData]);

  const totalLogins = useMemo(() => {
    return Object.values(countryData).reduce((sum, count) => sum + count, 0);
  }, [countryData]);

  const maxCount = useMemo(() => {
    return Math.max(...Object.values(countryData), 1);
  }, [countryData]);

  const countryCount = Object.keys(countryData).length;

  return (
    <div className="h-full p-4 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--card))] flex flex-col">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-[hsl(var(--muted-foreground))]">
          {showDemoIndicator && (
            <span className="mr-1 px-1.5 py-0.5 rounded text-[10px] bg-[hsl(var(--warning)/0.2)] text-[hsl(var(--warning))]">demo</span>
          )}
          // login_geography()
        </span>
        {isLoading && !showDemoIndicator ? (
          <Loader2 className="w-3 h-3 animate-spin text-[hsl(var(--muted-foreground))]" />
        ) : (
          <div className="flex items-center gap-1 text-xs text-[hsl(var(--info))]">
            {countryCount > 0 ? (
              <>
                <TrendingUp className="w-3 h-3" />
                <span className="tabular-nums">{countryCount} countries</span>
              </>
            ) : (
              <>
                <TrendingDown className="w-3 h-3 text-[hsl(var(--muted-foreground))]" />
                <span className="tabular-nums text-[hsl(var(--muted-foreground))]">no data</span>
              </>
            )}
          </div>
        )}
      </div>

      <div className="flex items-baseline gap-2 mb-2">
        <span className="text-2xl font-semibold text-[hsl(var(--foreground))] tabular-nums">
          {totalLogins.toLocaleString()}
        </span>
        <span className="text-xs text-[hsl(var(--muted-foreground))]">
          logins_30d
        </span>
      </div>

      <div className="flex-1 relative min-h-0 -mx-2">
        <svg
          viewBox="0 0 800 380"
          className="w-full h-full"
          preserveAspectRatio="xMidYMid meet"
        >
          {countries.map((country, index) => {
            const countryCode = idToCode[country.id] || '';
            const path = pathGenerator(country.geometry);
            if (!path) return null;

            return (
              <path
                key={country.id || `country-${index}`}
                d={path}
                fill={getCountryFill(countryCode, countryData, maxCount, isDark)}
                stroke={isDark ? 'hsl(0 0% 8%)' : 'hsl(0 0% 98%)'}
                strokeWidth="0.4"
                className="transition-colors duration-300"
              />
            );
          })}
        </svg>
      </div>

      <div className="flex items-center justify-between mt-1 pt-2 border-t border-[hsl(var(--border))]">
        <div className="flex items-center gap-3 text-[10px] text-[hsl(var(--muted-foreground))]">
          <div className="flex items-center gap-1.5">
            <div
              className="w-2.5 h-2.5 rounded-sm"
              style={{ background: isDark ? 'hsl(210 90% 65%)' : 'hsl(210 90% 35%)' }}
            />
            <span>high</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div
              className="w-2.5 h-2.5 rounded-sm"
              style={{ background: isDark ? 'hsl(210 50% 40%)' : 'hsl(210 60% 55%)' }}
            />
            <span>medium</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div
              className="w-2.5 h-2.5 rounded-sm"
              style={{ background: isDark ? 'hsl(220 8% 20%)' : 'hsl(220 8% 88%)' }}
            />
            <span>none</span>
          </div>
        </div>
        <span className="text-[10px] text-[hsl(var(--muted-foreground))]">last_30_days</span>
      </div>
    </div>
  );
}
