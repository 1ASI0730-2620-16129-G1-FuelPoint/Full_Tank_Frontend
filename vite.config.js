import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

const primeVueForms = new Set([
  'checkbox', 'fileupload', 'floatlabel', 'iconfield', 'inputicon',
  'inputnumber', 'inputtext', 'multiselect', 'rating', 'select',
  'selectbutton', 'textarea',
]);
const primeVueOverlays = new Set([
  'confirmdialog', 'dialog', 'drawer', 'menu', 'toast',
]);
const primeVueData = new Set(['column', 'datatable', 'row']);

export default defineConfig({
  plugins: [vue()],
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
  },
  test: {
    environment: 'node',
    setupFiles: ['./tests/setup.js'],
  },

  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('chart.js')) return 'vendor-charts';
          if (id.includes('@primeuix/themes')) return 'vendor-theme';
          if (id.includes('/primevue/')) {
            const component = id.split('/primevue/')[1]?.split('/')[0];
            if (primeVueForms.has(component)) return 'vendor-primevue-forms';
            if (primeVueOverlays.has(component)) return 'vendor-primevue-overlays';
            if (primeVueData.has(component)) return 'vendor-primevue-data';
            return 'vendor-primevue-core';
          }
          if (id.includes('vue') || id.includes('pinia')) return 'vendor-vue';
          if (id.includes('axios')) return 'vendor-http';
          return 'vendor';
        },
      },
    },
  },
})
