import { defineConfig } from 'pledge';

export default defineConfig({
  framework: 'react',
  source_maps: true,
  dev_server: {
    port: 3000,
    hmr: true,
  },
});
