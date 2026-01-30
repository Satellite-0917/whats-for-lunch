'use client';

import { useEffect, useMemo, useState } from 'react';

type CommentItem = {
  id: string;
  place_id: string;
  nickname: string;
  content: string;
  created_at: string;
};

type CommentSectionProps = {
  placeId: string;
  adminMode: boolean;
  adminPassword: string;
};

const COOLDOWN_MS = 20_000;

const adjectives = ['배고픈', '졸린', '신나는', '따뜻한', '용감한', '부지런한'];
const animals = ['수달', '토끼', '고양이', '강아지', '여우', '펭귄'];

function randomNickname() {
  const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
  const animal = animals[Math.floor(Math.random() * animals.length)];
  const suffix = Math.floor(Math.random() * 900 + 100);
  return `${adjective} ${animal}#${suffix}`;
}

export default function CommentSection({ placeId, adminMode, adminPassword }: CommentSectionProps) {
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [content, setContent] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [cooldownUntil, setCooldownUntil] = useState<number | null>(null);

  const nickname = useMemo(() => randomNickname(), [placeId]);

  useEffect(() => {
    const fetchComments = async () => {
      try {
        setStatus('loading');
        const response = await fetch(`/api/comments?place_id=${placeId}`);
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.message ?? '댓글을 불러오지 못했습니다.');
        }
        setComments(data.comments ?? []);
        setStatus('idle');
      } catch (error) {
        setStatus('error');
        setErrorMessage(error instanceof Error ? error.message : '댓글을 불러오지 못했습니다.');
      }
    };
    fetchComments();
  }, [placeId]);

  useEffect(() => {
    const stored = localStorage.getItem(`commentCooldown:${placeId}`);
    if (stored) {
      setCooldownUntil(Number(stored));
    }
  }, [placeId]);

  const canSubmit = !cooldownUntil || Date.now() > cooldownUntil;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!content.trim()) return;

    try {
      const response = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ place_id: placeId, nickname, content: content.trim() }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message ?? '댓글 작성에 실패했습니다.');
      }
      setComments((prev) => [data.comment, ...prev]);
      setContent('');
      const nextCooldown = Date.now() + COOLDOWN_MS;
      localStorage.setItem(`commentCooldown:${placeId}`, String(nextCooldown));
      setCooldownUntil(nextCooldown);
    } catch (error) {
      setStatus('error');
      setErrorMessage(error instanceof Error ? error.message : '댓글 작성에 실패했습니다.');
    }
  };

  const handleDelete = async (commentId: string) => {
    try {
      const response = await fetch('/api/comments', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ place_id: placeId, id: commentId, admin_password: adminPassword }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message ?? '댓글 삭제에 실패했습니다.');
      }
      setComments((prev) => prev.filter((comment) => comment.id !== commentId));
    } catch (error) {
      setStatus('error');
      setErrorMessage(error instanceof Error ? error.message : '댓글 삭제에 실패했습니다.');
    }
  };

  return (
    <div className="comment-section">
      <div className="comment-section__header">
        <strong>댓글</strong>
        <span>익명 · 최대 200자 · 20초 쿨다운</span>
      </div>
      <form className="comment-section__form" onSubmit={handleSubmit}>
        <input type="text" value={nickname} readOnly />
        <textarea
          value={content}
          onChange={(event) => setContent(event.target.value)}
          placeholder="댓글을 입력해 주세요. (링크 금지)"
          maxLength={200}
        />
        <button type="submit" disabled={!canSubmit || !content.trim()}>
          댓글 작성
        </button>
      </form>
      {!canSubmit && <p className="comment-section__cooldown">잠시 후 다시 작성할 수 있어요.</p>}
      {status === 'error' && <p className="comment-section__error">{errorMessage}</p>}
      {status === 'loading' && <p className="comment-section__loading">댓글을 불러오는 중...</p>}
      {status === 'idle' && comments.length === 0 && (
        <p className="comment-section__empty">첫 댓글을 남겨보세요.</p>
      )}
      <ul className="comment-section__list">
        {comments.map((comment) => (
          <li key={comment.id}>
            <div>
              <strong>{comment.nickname}</strong>
              <span>{new Date(comment.created_at).toLocaleString()}</span>
            </div>
            <p>{comment.content}</p>
            {adminMode && (
              <button type="button" onClick={() => handleDelete(comment.id)}>
                삭제
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
