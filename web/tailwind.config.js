export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      // 숫자는 Archivo, 한글은 Gothic A1. 폰트가 뜨기 전에도 레이아웃이
      // 무너지지 않도록 대체 스택의 폭을 비슷하게 잡는다.
      fontFamily: {
        sans: ['"Gothic A1"', "system-ui", "-apple-system", "sans-serif"],
        num: ["Archivo", "system-ui", "-apple-system", "sans-serif"],
      },
      // 본문 배경(#F6F7F5) 위에서 전부 4.5:1 이상이 되도록 잡은 값들이다.
      // 캡션 회색과 상승 빨강은 눈대중으로 고르면 거의 항상 기준에 못 미친다.
      colors: {
        paper: "#F6F7F5",
        ink: "#14171A",
        sub: "#4B5257",
        muted: "#676E74",   // 4.7:1
        rule: "#E1E4E1",
        up: "#C4322A",      // 5.0:1
        down: "#2563C7",    // 5.1:1
        fresh: "#1F7A4D",   // 4.9:1
      },
    },
  },
  plugins: [],
}
