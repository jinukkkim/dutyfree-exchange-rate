export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      // 아이폰·안드로이드가 같은 모습이도록 시스템 서체 대신 Pretendard 하나를 싣는다.
      // 파일은 빌드 때 이 사이트에 쓰인 글자만 남긴다(vite.config.ts). 뒤의 목록은
      // 파일이 도착하기 전 잠깐과, 빌드 뒤에 새로 생긴 글자를 메운다.
      fontFamily: {
        sans: [
          '"Pretendard Variable"',
          "-apple-system",
          "BlinkMacSystemFont",
          '"Apple SD Gothic Neo"',
          '"Noto Sans KR"',
          "sans-serif",
        ],
        // Tailwind 기본 고정폭 목록에 Pretendard 만 끼운다. 고정폭 서체엔 한글이
        // 없어서, 없으면 /guide 도식의 한글이 기기 서체로 떨어진다. 일반 이름
        // monospace 는 어느 기기에서나 잡히므로 반드시 그 앞이어야 한다.
        mono: [
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "Monaco",
          "Consolas",
          '"Liberation Mono"',
          '"Courier New"',
          '"Pretendard Variable"',
          "monospace",
        ],
      },
      // 흰 바탕 위에서 전부 4.5:1 이상이다. #86868B(3.6:1)는 쓰지 않는다.
      colors: {
        ink: "#1D1D1F",
        sub: "#424245",
        muted: "#6E6E73",   // 5.1:1
        rule: "#D2D2D7",
        tint: "#F5F5F7",
        nav: "#FBFBFD",
        link: "#0066CC",    // 5.6:1
        key: "#0071E3",     // 흰 글자와 4.7:1
        up: "#C4001A",
        down: "#0B4EC2",
        upTint: "#FFE9E9",
        downTint: "#E7EFFF",
        flatTint: "#F0F0F2",
      },
      maxWidth: { page: "820px", chart: "720px" },
    },
  },
  plugins: [],
}
