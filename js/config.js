// Recharge settings — edit this file only.
window.AEGIS_CONFIG = {
  recharge: {
    enabled: true,
    currency: '₱',
    discord: 'https://discord.gg/WBAmVQtfAa',
    // Leave empty for manual mode (customer pays, then sends proof on Discord).
    // Or set to your own backend URL: it receives the order as JSON and must reply
    // { "ok": true, "checkoutUrl": "https://..." } (checkoutUrl optional).
    // Never put secret API keys in this file; it is public.
    apiEndpoint: '',
    // Empty "account" = payment details are given on Discord.
    methods: [
      { id: 'gcash', name: 'GCash', account: '' },
      { id: 'maya', name: 'Maya', account: '' },
      { id: 'bank', name: 'Bank Transfer', account: '' }
    ],
    // Sample packages: change prices/coins/bonus to your real ones.
    packages: [
      { id: 'p50', price: 50, coins: 500, bonus: 0 },
      { id: 'p100', price: 100, coins: 1000, bonus: 50 },
      { id: 'p300', price: 300, coins: 3000, bonus: 300 },
      { id: 'p500', price: 500, coins: 5000, bonus: 750 },
      { id: 'p1000', price: 1000, coins: 10000, bonus: 2000 }
    ]
  }
};
