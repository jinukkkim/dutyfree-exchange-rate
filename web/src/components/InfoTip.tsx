import { useEffect, useId, useRef, useState, type ReactNode } from "react"
import { createPortal } from "react-dom"

const WIDTH = 280
const GUTTER = 16

/**
 * ⓘ 를 누르면 그 아래에 설명이 고정되고, 다시 누르거나 다른 곳을 누르거나 Esc 면
 * 닫힌다. 마우스는 올리기만 해도 뜨고 내리면 사라진다. 터치에서는 hover 가 없어서
 * (pointerenter 가 탭마다 같이 오기도 해서) 마우스일 때만 hover 로 연다.
 *
 * 말풍선은 body 로 빼서 문서 좌표에 둔다. ⓘ 가 absolute 칸(고시 전 안내) 안에
 * 있어도 잘리지 않고, 스크롤하면 문장과 같이 움직인다. 화면 가장자리에 붙은
 * ⓘ 라도 말풍선은 좌우 16px 안에 머문다.
 * ponytail: 열린 채 화면을 돌리면 자리가 어긋난다. 그럴 일이 잦으면 resize 에 닫는다.
 */
export default function InfoTip({ label, children }: { label: string; children: ReactNode }) {
  const id = useId()
  const button = useRef<HTMLButtonElement>(null)
  const tip = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null)
  const [pinned, setPinned] = useState(false)
  const [hovered, setHovered] = useState(false)
  const open = pinned || hovered

  useEffect(() => {
    if (!open) return
    const onPointer = (e: PointerEvent) => {
      const t = e.target as Node
      if (!button.current?.contains(t) && !tip.current?.contains(t)) setPinned(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return
      setPinned(false)
      setHovered(false)
    }
    document.addEventListener("pointerdown", onPointer)
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("pointerdown", onPointer)
      document.removeEventListener("keydown", onKey)
    }
  }, [open])

  function click() {
    // 고정된 걸 누르면 마우스가 아직 위에 있어도 닫는다. 아니면 눌렀는데 그대로라 고장처럼 보인다.
    if (pinned) {
      setPinned(false)
      setHovered(false)
      return
    }
    if (!open) place()
    setPinned(true)
  }

  function place() {
    const r = button.current!.getBoundingClientRect()
    const vw = document.documentElement.clientWidth
    const width = Math.min(WIDTH, vw - GUTTER * 2)
    const left = Math.min(Math.max(r.left + r.width / 2 - width / 2, GUTTER), vw - GUTTER - width)
    setPos({ top: r.bottom + window.scrollY + 6, left: left + window.scrollX, width })
  }

  return (
    <>
      {/* 윗첨자처럼 문장 위쪽에 작게 붙는다. 아이콘은 10px 이지만 누르는 자리는
          위·아래·오른쪽으로 8px 더 넓다. 왼쪽 패딩이 곧 문장과의 간격이다. */}
      <button
        ref={button}
        type="button"
        onClick={click}
        onPointerEnter={(e) => {
          if (e.pointerType !== "mouse" || open) return
          place()
          setHovered(true)
        }}
        onPointerLeave={(e) => e.pointerType === "mouse" && setHovered(false)}
        aria-label={label}
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        className="relative -top-[0.3em] -my-2 -mr-2 inline-flex py-2 pl-0.5 pr-2 text-muted hover:text-ink"
      >
        <svg width="10" height="10" viewBox="0 0 16 16" aria-hidden="true">
          <circle cx="8" cy="8" r="7" fill="none" stroke="currentColor" strokeWidth="1.6" />
          <path d="M8 7.2v4.3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <circle cx="8" cy="4.8" r="1.1" fill="currentColor" />
        </svg>
      </button>
      {open &&
        pos &&
        createPortal(
          <div
            ref={tip}
            id={id}
            role="note"
            style={{ top: pos.top, left: pos.left, width: pos.width }}
            className="absolute z-10 rounded-xl border border-rule bg-white px-3.5 py-2.5 break-keep text-left text-[13px] leading-relaxed text-sub shadow-[0_4px_16px_rgba(0,0,0,0.08)]"
          >
            {children}
          </div>,
          document.body,
        )}
    </>
  )
}
