import config from './playwright.config.js';
export default {
  ...config,
  use:{...config.use,baseURL:'http://localhost:3002'},
  webServer:{command:'npm run start -- --port 3002',url:'http://localhost:3002',reuseExistingServer:false},
};
