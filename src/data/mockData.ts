export const chartData = [
  { date: 'Dec 8', users: 7200 },
  { date: 'Dec 15', users: 7350 },
  { date: 'Dec 22', users: 7500 },
  { date: 'Dec 29', users: 7680 },
  { date: 'Jan 5', users: 7850 },
  { date: 'Jan 12', users: 8050 },
  { date: 'Jan 19', users: 8200 },
];

export const recentUsers = [
  { id: 1, time: '9h ago', name: 'Vincent Willemsen', avatar: 'V', color: 'bg-purple-500', location: '-', device: '-' },
  { id: 2, time: '9h ago', name: 'Lewis Ndegwa', avatar: 'L', color: 'bg-orange-500', location: '-', device: '-' },
  { id: 3, time: '9h ago', name: 'Vahan Merty', avatar: null, color: 'bg-blue-500', location: '-', device: '-' },
  { id: 4, time: '10h ago', name: 'Drew Benjamin', avatar: 'D', color: 'bg-gray-500', location: '-', device: '-' },
  { id: 5, time: '10h ago', name: 'Slade Wooten', avatar: null, color: 'bg-blue-400', location: '-', device: '-' },
  { id: 6, time: '11h ago', name: 'R S', avatar: 'R', color: 'bg-green-500', location: '-', device: '-' },
];

export const activityEvents = [
  { type: 'added', email: 'de222@gmail.com', target: 'aaaaaaaaaa', time: '23:26' },
  { type: 'session', user: 'Lijan Haque', action: 'Session created for', time: '23:26' },
  { type: 'signin', user: 'Lijan Haque', action: 'signed in', time: '23:26' },
  { type: 'linked', user: 'Lijan Haque', provider: 'google', time: '23:21' },
  { type: 'revoked', user: 'krishnA tiwari', action: 'Session revoked for', time: '21:32' },
  { type: 'joined', user: 'krishnA tiwari', action: 'has joined', time: '21:31' },
  { type: 'linked', user: 'BL19', provider: 'github', time: '21:04' },
];

export const topCountries = [
  { rank: 1, country: 'India', flag: '🇮🇳', count: 152, percentage: 12.6 },
  { rank: 2, country: 'Thailand', flag: '🇹🇭', count: 51, percentage: 4.2 },
  { rank: 3, country: 'Brazil', flag: '🇧🇷', count: 31, percentage: 2.5 },
  { rank: 4, country: 'Pakistan', flag: '🇵🇰', count: 31, percentage: 2.5 },
  { rank: 5, country: 'Turkey', flag: '🇹🇷', count: 21, percentage: 1.7 },
];

export const insights = [
  {
    id: 1,
    type: 'security',
    title: 'IP Address Headers Not Configured',
    description: 'Configure IP headers based on your deployment platform for accurate rate limiting.',
  },
  {
    id: 2,
    type: 'performance',
    title: 'Secondary Storage Not Configured',
    description: 'Define secondary storage for faster session lookups and better rate limiting.',
  },
];
