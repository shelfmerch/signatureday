// vite.config.ts
import { defineConfig } from "file:///E:/signatureday/signatureday/node_modules/vite/dist/node/index.js";
import react from "file:///E:/signatureday/signatureday/node_modules/@vitejs/plugin-react-swc/index.js";
import path from "path";
var __vite_injected_original_dirname = "E:\\signatureday\\signatureday";
var vite_config_default = defineConfig({
  server: {
    host: "::",
    port: 8080,
    proxy: {
      "/api/partner": {
        target: "http://localhost:5000",
        changeOrigin: true,
        secure: false,
        rewrite: (path2) => path2
        // Keep the path as is
      },
      "/api": {
        target: "http://localhost:4000",
        changeOrigin: true,
        secure: false
      }
    }
  },
  plugins: [
    react()
  ],
  resolve: {
    alias: {
      "@": path.resolve(__vite_injected_original_dirname, "./src")
    }
  },
  build: {
    // Performance optimizations
    target: "esnext",
    minify: "esbuild",
    sourcemap: false,
    // Chunk splitting for better caching
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["react", "react-dom"],
          router: ["react-router-dom"],
          ui: ["@radix-ui/react-dialog", "@radix-ui/react-dropdown-menu", "@radix-ui/react-toast"],
          utils: ["framer-motion", "axios", "date-fns"],
          canvas: ["fabric", "html2canvas", "face-api.js"]
        },
        // Optimize chunk names for better caching
        chunkFileNames: (chunkInfo) => {
          const facadeModuleId = chunkInfo.facadeModuleId ? chunkInfo.facadeModuleId.split("/").pop() : "chunk";
          return `js/[name]-[hash].js`;
        },
        entryFileNames: "js/[name]-[hash].js",
        assetFileNames: (assetInfo) => {
          if (!assetInfo.name) return "assets/[name]-[hash][extname]";
          const info = assetInfo.name.split(".");
          const ext = info[info.length - 1];
          if (/\.(css)$/.test(assetInfo.name)) {
            return `css/[name]-[hash].${ext}`;
          }
          if (/\.(png|jpe?g|svg|gif|tiff|bmp|ico)$/i.test(assetInfo.name)) {
            return `images/[name]-[hash].${ext}`;
          }
          if (/\.(woff2?|eot|ttf|otf)$/i.test(assetInfo.name)) {
            return `fonts/[name]-[hash].${ext}`;
          }
          return `assets/[name]-[hash].${ext}`;
        }
      }
    },
    // Compression and optimization
    cssCodeSplit: true,
    reportCompressedSize: false,
    chunkSizeWarningLimit: 1e3
  },
  // Optimize dependencies
  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "react-router-dom",
      "framer-motion",
      "axios",
      "date-fns",
      "fabric",
      "html2canvas",
      "face-api.js"
    ],
    exclude: ["@jsquash/oxipng"]
  },
  // CSS optimization
  css: {
    devSourcemap: false
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJFOlxcXFxzaWduYXR1cmVkYXlcXFxcc2lnbmF0dXJlZGF5XCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCJFOlxcXFxzaWduYXR1cmVkYXlcXFxcc2lnbmF0dXJlZGF5XFxcXHZpdGUuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9FOi9zaWduYXR1cmVkYXkvc2lnbmF0dXJlZGF5L3ZpdGUuY29uZmlnLnRzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSBcInZpdGVcIjtcclxuaW1wb3J0IHJlYWN0IGZyb20gXCJAdml0ZWpzL3BsdWdpbi1yZWFjdC1zd2NcIjtcclxuaW1wb3J0IHBhdGggZnJvbSBcInBhdGhcIjtcclxuXHJcbi8vIGh0dHBzOi8vdml0ZWpzLmRldi9jb25maWcvXHJcbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZyh7XHJcbiAgc2VydmVyOiB7XHJcbiAgICBob3N0OiBcIjo6XCIsXHJcbiAgICBwb3J0OiA4MDgwLFxyXG4gICAgcHJveHk6IHtcclxuICAgICAgXCIvYXBpL3BhcnRuZXJcIjoge1xyXG4gICAgICAgIHRhcmdldDogXCJodHRwOi8vbG9jYWxob3N0OjUwMDBcIixcclxuICAgICAgICBjaGFuZ2VPcmlnaW46IHRydWUsXHJcbiAgICAgICAgc2VjdXJlOiBmYWxzZSxcclxuICAgICAgICByZXdyaXRlOiAocGF0aCkgPT4gcGF0aCAvLyBLZWVwIHRoZSBwYXRoIGFzIGlzXHJcbiAgICAgIH0sXHJcbiAgICAgIFwiL2FwaVwiOiB7XHJcbiAgICAgICAgdGFyZ2V0OiBcImh0dHA6Ly9sb2NhbGhvc3Q6NDAwMFwiLFxyXG4gICAgICAgIGNoYW5nZU9yaWdpbjogdHJ1ZSxcclxuICAgICAgICBzZWN1cmU6IGZhbHNlXHJcbiAgICAgIH1cclxuICAgIH1cclxuICB9LFxyXG4gIHBsdWdpbnM6IFtcclxuICAgIHJlYWN0KCksXHJcbiAgXSxcclxuICByZXNvbHZlOiB7XHJcbiAgICBhbGlhczoge1xyXG4gICAgICBcIkBcIjogcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgXCIuL3NyY1wiKSxcclxuICAgIH0sXHJcbiAgfSxcclxuICBidWlsZDoge1xyXG4gICAgLy8gUGVyZm9ybWFuY2Ugb3B0aW1pemF0aW9uc1xyXG4gICAgdGFyZ2V0OiAnZXNuZXh0JyxcclxuICAgIG1pbmlmeTogJ2VzYnVpbGQnLFxyXG4gICAgc291cmNlbWFwOiBmYWxzZSxcclxuICAgIFxyXG4gICAgLy8gQ2h1bmsgc3BsaXR0aW5nIGZvciBiZXR0ZXIgY2FjaGluZ1xyXG4gICAgcm9sbHVwT3B0aW9uczoge1xyXG4gICAgICBvdXRwdXQ6IHtcclxuICAgICAgICBtYW51YWxDaHVua3M6IHtcclxuICAgICAgICAgIHZlbmRvcjogWydyZWFjdCcsICdyZWFjdC1kb20nXSxcclxuICAgICAgICAgIHJvdXRlcjogWydyZWFjdC1yb3V0ZXItZG9tJ10sXHJcbiAgICAgICAgICB1aTogWydAcmFkaXgtdWkvcmVhY3QtZGlhbG9nJywgJ0ByYWRpeC11aS9yZWFjdC1kcm9wZG93bi1tZW51JywgJ0ByYWRpeC11aS9yZWFjdC10b2FzdCddLFxyXG4gICAgICAgICAgdXRpbHM6IFsnZnJhbWVyLW1vdGlvbicsICdheGlvcycsICdkYXRlLWZucyddLFxyXG4gICAgICAgICAgY2FudmFzOiBbJ2ZhYnJpYycsICdodG1sMmNhbnZhcycsICdmYWNlLWFwaS5qcyddXHJcbiAgICAgICAgfSxcclxuICAgICAgICAvLyBPcHRpbWl6ZSBjaHVuayBuYW1lcyBmb3IgYmV0dGVyIGNhY2hpbmdcclxuICAgICAgICBjaHVua0ZpbGVOYW1lczogKGNodW5rSW5mbykgPT4ge1xyXG4gICAgICAgICAgY29uc3QgZmFjYWRlTW9kdWxlSWQgPSBjaHVua0luZm8uZmFjYWRlTW9kdWxlSWQgPyBjaHVua0luZm8uZmFjYWRlTW9kdWxlSWQuc3BsaXQoJy8nKS5wb3AoKSA6ICdjaHVuayc7XHJcbiAgICAgICAgICByZXR1cm4gYGpzL1tuYW1lXS1baGFzaF0uanNgO1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgZW50cnlGaWxlTmFtZXM6ICdqcy9bbmFtZV0tW2hhc2hdLmpzJyxcclxuICAgICAgICBhc3NldEZpbGVOYW1lczogKGFzc2V0SW5mbykgPT4ge1xyXG4gICAgICAgICAgaWYgKCFhc3NldEluZm8ubmFtZSkgcmV0dXJuICdhc3NldHMvW25hbWVdLVtoYXNoXVtleHRuYW1lXSc7XHJcbiAgICAgICAgICBcclxuICAgICAgICAgIGNvbnN0IGluZm8gPSBhc3NldEluZm8ubmFtZS5zcGxpdCgnLicpO1xyXG4gICAgICAgICAgY29uc3QgZXh0ID0gaW5mb1tpbmZvLmxlbmd0aCAtIDFdO1xyXG4gICAgICAgICAgaWYgKC9cXC4oY3NzKSQvLnRlc3QoYXNzZXRJbmZvLm5hbWUpKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBgY3NzL1tuYW1lXS1baGFzaF0uJHtleHR9YDtcclxuICAgICAgICAgIH1cclxuICAgICAgICAgIGlmICgvXFwuKHBuZ3xqcGU/Z3xzdmd8Z2lmfHRpZmZ8Ym1wfGljbykkL2kudGVzdChhc3NldEluZm8ubmFtZSkpIHtcclxuICAgICAgICAgICAgcmV0dXJuIGBpbWFnZXMvW25hbWVdLVtoYXNoXS4ke2V4dH1gO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgaWYgKC9cXC4od29mZjI/fGVvdHx0dGZ8b3RmKSQvaS50ZXN0KGFzc2V0SW5mby5uYW1lKSkge1xyXG4gICAgICAgICAgICByZXR1cm4gYGZvbnRzL1tuYW1lXS1baGFzaF0uJHtleHR9YDtcclxuICAgICAgICAgIH1cclxuICAgICAgICAgIHJldHVybiBgYXNzZXRzL1tuYW1lXS1baGFzaF0uJHtleHR9YDtcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgIH0sXHJcbiAgICBcclxuICAgIC8vIENvbXByZXNzaW9uIGFuZCBvcHRpbWl6YXRpb25cclxuICAgIGNzc0NvZGVTcGxpdDogdHJ1ZSxcclxuICAgIHJlcG9ydENvbXByZXNzZWRTaXplOiBmYWxzZSxcclxuICAgIGNodW5rU2l6ZVdhcm5pbmdMaW1pdDogMTAwMCxcclxuICB9LFxyXG4gIFxyXG4gIC8vIE9wdGltaXplIGRlcGVuZGVuY2llc1xyXG4gIG9wdGltaXplRGVwczoge1xyXG4gICAgaW5jbHVkZTogW1xyXG4gICAgICAncmVhY3QnLFxyXG4gICAgICAncmVhY3QtZG9tJyxcclxuICAgICAgJ3JlYWN0LXJvdXRlci1kb20nLFxyXG4gICAgICAnZnJhbWVyLW1vdGlvbicsXHJcbiAgICAgICdheGlvcycsXHJcbiAgICAgICdkYXRlLWZucycsXHJcbiAgICAgICdmYWJyaWMnLFxyXG4gICAgICAnaHRtbDJjYW52YXMnLFxyXG4gICAgICAnZmFjZS1hcGkuanMnXHJcbiAgICBdLFxyXG4gICAgZXhjbHVkZTogWydAanNxdWFzaC9veGlwbmcnXVxyXG4gIH0sXHJcbiAgXHJcbiAgLy8gQ1NTIG9wdGltaXphdGlvblxyXG4gIGNzczoge1xyXG4gICAgZGV2U291cmNlbWFwOiBmYWxzZVxyXG4gIH1cclxufSk7XHJcbiJdLAogICJtYXBwaW5ncyI6ICI7QUFBNFEsU0FBUyxvQkFBb0I7QUFDelMsT0FBTyxXQUFXO0FBQ2xCLE9BQU8sVUFBVTtBQUZqQixJQUFNLG1DQUFtQztBQUt6QyxJQUFPLHNCQUFRLGFBQWE7QUFBQSxFQUMxQixRQUFRO0FBQUEsSUFDTixNQUFNO0FBQUEsSUFDTixNQUFNO0FBQUEsSUFDTixPQUFPO0FBQUEsTUFDTCxnQkFBZ0I7QUFBQSxRQUNkLFFBQVE7QUFBQSxRQUNSLGNBQWM7QUFBQSxRQUNkLFFBQVE7QUFBQSxRQUNSLFNBQVMsQ0FBQ0EsVUFBU0E7QUFBQTtBQUFBLE1BQ3JCO0FBQUEsTUFDQSxRQUFRO0FBQUEsUUFDTixRQUFRO0FBQUEsUUFDUixjQUFjO0FBQUEsUUFDZCxRQUFRO0FBQUEsTUFDVjtBQUFBLElBQ0Y7QUFBQSxFQUNGO0FBQUEsRUFDQSxTQUFTO0FBQUEsSUFDUCxNQUFNO0FBQUEsRUFDUjtBQUFBLEVBQ0EsU0FBUztBQUFBLElBQ1AsT0FBTztBQUFBLE1BQ0wsS0FBSyxLQUFLLFFBQVEsa0NBQVcsT0FBTztBQUFBLElBQ3RDO0FBQUEsRUFDRjtBQUFBLEVBQ0EsT0FBTztBQUFBO0FBQUEsSUFFTCxRQUFRO0FBQUEsSUFDUixRQUFRO0FBQUEsSUFDUixXQUFXO0FBQUE7QUFBQSxJQUdYLGVBQWU7QUFBQSxNQUNiLFFBQVE7QUFBQSxRQUNOLGNBQWM7QUFBQSxVQUNaLFFBQVEsQ0FBQyxTQUFTLFdBQVc7QUFBQSxVQUM3QixRQUFRLENBQUMsa0JBQWtCO0FBQUEsVUFDM0IsSUFBSSxDQUFDLDBCQUEwQixpQ0FBaUMsdUJBQXVCO0FBQUEsVUFDdkYsT0FBTyxDQUFDLGlCQUFpQixTQUFTLFVBQVU7QUFBQSxVQUM1QyxRQUFRLENBQUMsVUFBVSxlQUFlLGFBQWE7QUFBQSxRQUNqRDtBQUFBO0FBQUEsUUFFQSxnQkFBZ0IsQ0FBQyxjQUFjO0FBQzdCLGdCQUFNLGlCQUFpQixVQUFVLGlCQUFpQixVQUFVLGVBQWUsTUFBTSxHQUFHLEVBQUUsSUFBSSxJQUFJO0FBQzlGLGlCQUFPO0FBQUEsUUFDVDtBQUFBLFFBQ0EsZ0JBQWdCO0FBQUEsUUFDaEIsZ0JBQWdCLENBQUMsY0FBYztBQUM3QixjQUFJLENBQUMsVUFBVSxLQUFNLFFBQU87QUFFNUIsZ0JBQU0sT0FBTyxVQUFVLEtBQUssTUFBTSxHQUFHO0FBQ3JDLGdCQUFNLE1BQU0sS0FBSyxLQUFLLFNBQVMsQ0FBQztBQUNoQyxjQUFJLFdBQVcsS0FBSyxVQUFVLElBQUksR0FBRztBQUNuQyxtQkFBTyxxQkFBcUIsR0FBRztBQUFBLFVBQ2pDO0FBQ0EsY0FBSSx1Q0FBdUMsS0FBSyxVQUFVLElBQUksR0FBRztBQUMvRCxtQkFBTyx3QkFBd0IsR0FBRztBQUFBLFVBQ3BDO0FBQ0EsY0FBSSwyQkFBMkIsS0FBSyxVQUFVLElBQUksR0FBRztBQUNuRCxtQkFBTyx1QkFBdUIsR0FBRztBQUFBLFVBQ25DO0FBQ0EsaUJBQU8sd0JBQXdCLEdBQUc7QUFBQSxRQUNwQztBQUFBLE1BQ0Y7QUFBQSxJQUNGO0FBQUE7QUFBQSxJQUdBLGNBQWM7QUFBQSxJQUNkLHNCQUFzQjtBQUFBLElBQ3RCLHVCQUF1QjtBQUFBLEVBQ3pCO0FBQUE7QUFBQSxFQUdBLGNBQWM7QUFBQSxJQUNaLFNBQVM7QUFBQSxNQUNQO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxJQUNGO0FBQUEsSUFDQSxTQUFTLENBQUMsaUJBQWlCO0FBQUEsRUFDN0I7QUFBQTtBQUFBLEVBR0EsS0FBSztBQUFBLElBQ0gsY0FBYztBQUFBLEVBQ2hCO0FBQ0YsQ0FBQzsiLAogICJuYW1lcyI6IFsicGF0aCJdCn0K
