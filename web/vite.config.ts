import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"

export default defineConfig({
  plugins: [react()],
  // data/ 는 리포 루트에 있고 web/ 바깥이다. ?raw 임포트를 허용하려면 필요하다.
  server: { fs: { allow: [".."] } },
  test: { environment: "jsdom" },
})
