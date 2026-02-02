"use client";

import { useMemo, useState } from "react";

type Place = {
  place_id: string;
  name: string;
  category: string;
  distanceKm?: number;
};

type Props = {
  places: Place[];
  selectedPlace: Place | null;
  onSelect: (placeId: string) => void;
};

export default function PlaceSheet({ places, selectedPlace, onSelect }: Props) {
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const v = q.trim().toLowerCase();
    if (!v) return places;
    return places.filter(p => (p.name ?? "").toLowerCase().includes(v));
  }, [q, places]);

  return (
    <div style={{ maxWidth: 520, margin: "0 auto", padding: 16 }}>
      {/* 검색 */}
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="가게 이름 검색"
        style={{
          width: "100%",
          padding: "10px 12px",
          borderRadius: 12,
          border: "1px solid #e5e7eb",
          marginBottom: 12,
        }}
      />

      {/* 리스트 */}
      <div style={{ display: "grid", gap: 10 }}>
        {filtered.length === 0 ? (
          <div style={{ padding: 14, borderRadius: 12, border: "1px solid #eee", color: "#666" }}>
            조건에 맞는 장소가 없습니다
          </div>
        ) : (
          filtered.map((p) => {
            const active = selectedPlace?.place_id === p.place_id;
            return (
              <button
                key={p.place_id}
                onClick={() => onSelect(p.place_id)}
                style={{
                  textAlign: "left",
                  padding: 14,
                  borderRadius: 14,
                  border: active ? "2px solid #111827" : "1px solid #e5e7eb",
                  background: "#fff",
                  cursor: "pointer",
                }}
              >
                <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>
                  {p.name}
                </div>
                <div style={{ color: "#6b7280", fontSize: 13 }}>
                  {p.category || "카테고리 없음"}
                  {typeof p.distanceKm === "number" ? ` · ${Math.round(p.distanceKm * 1000)}m` : ""}
                </div>
              </button>
            );
          })
        )}
      </div>

      {/* 선택된 가게 상세 영역 */}
      {selectedPlace && (
        <div style={{ marginTop: 16, padding: 14, borderRadius: 16, border: "1px solid #e5e7eb" }}>
          <div style={{ fontWeight: 800, fontSize: 16 }}>{selectedPlace.name}</div>
          <div style={{ color: "#6b7280", fontSize: 13, marginTop: 4 }}>
            {selectedPlace.category || "카테고리 없음"}
          </div>

          <div style={{ marginTop: 12 }}>
            <PlaceComments placeId={selectedPlace.place_id} />
          </div>
        </div>
      )}
    </div>
  );
}

/** 댓글 컴포넌트 (다음 섹션의 API 붙이면 바로 동작) */
function PlaceComments({ placeId }: { placeId: string }) {
  const [items, setItems] = useState<{ id: string; text: string; createdAt: string }[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);

  async function load() {
    const res = await fetch(`/api/comments?placeId=${encodeURIComponent(placeId)}`);
    const data = await res.json();
    setItems(data.items ?? []);
  }

  async function submit() {
    const v = text.trim();
    if (!v) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ placeId, text: v }),
      });
      if (!res.ok) throw new Error("failed");
      setText("");
      await load();
    } finally {
      setLoading(false);
    }
  }

  // placeId 바뀔 때마다 로드
  useMemo(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placeId]);

  return (
    <div>
      <div style={{ fontWeight: 700, marginBottom: 8 }}>익명 댓글</div>

      <div style={{ display: "grid", gap: 8, marginBottom: 10 }}>
        {items.length === 0 ? (
          <div style={{ color: "#6b7280", fontSize: 13 }}>아직 댓글이 없어요.</div>
        ) : (
          items.map((c) => (
            <div key={c.id} style={{ padding: 10, borderRadius: 12, border: "1px solid #eee" }}>
              <div style={{ fontSize: 14 }}>{c.text}</div>
              <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 4 }}>{c.createdAt}</div>
            </div>
          ))
        )}
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="익명으로 댓글 남기기 (최대 200자)"
          maxLength={200}
          style={{ flex: 1, padding: "10px 12px", borderRadius: 12, border: "1px solid #e5e7eb" }}
        />
        <button
          onClick={submit}
          disabled={loading}
          style={{
            padding: "10px 14px",
            borderRadius: 12,
            border: "1px solid #111827",
            background: "#111827",
            color: "#fff",
            cursor: "pointer",
            opacity: loading ? 0.6 : 1,
          }}
        >
          등록
        </button>
      </div>
    </div>
  );
}
