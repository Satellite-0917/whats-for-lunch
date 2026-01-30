import { NextResponse } from 'next/server';

export type CommentItem = {
  id: string;
  place_id: string;
  nickname: string;
  content: string;
  created_at: string;
};

const commentsStore = new Map<string, CommentItem[]>();

function containsLink(content: string) {
  return /(https?:\/\/|www\.)\S+/i.test(content);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const placeId = url.searchParams.get('place_id');
  if (!placeId) {
    return NextResponse.json({ message: 'place_id가 필요합니다.' }, { status: 400 });
  }
  const comments = commentsStore.get(placeId) ?? [];
  return NextResponse.json({ comments });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      place_id?: string;
      nickname?: string;
      content?: string;
    };

    if (!body.place_id || !body.nickname || !body.content) {
      return NextResponse.json({ message: '필수 값이 누락되었습니다.' }, { status: 400 });
    }

    if (body.content.length > 200) {
      return NextResponse.json({ message: '댓글은 200자 이내로 입력해 주세요.' }, { status: 400 });
    }

    if (containsLink(body.content)) {
      return NextResponse.json({ message: '링크가 포함된 댓글은 작성할 수 없습니다.' }, { status: 400 });
    }

    const newComment: CommentItem = {
      id: crypto.randomUUID(),
      place_id: body.place_id,
      nickname: body.nickname,
      content: body.content,
      created_at: new Date().toISOString(),
    };

    const existing = commentsStore.get(body.place_id) ?? [];
    commentsStore.set(body.place_id, [newComment, ...existing]);

    return NextResponse.json({ comment: newComment });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : '댓글 작성에 실패했습니다.' },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const body = (await request.json()) as { place_id?: string; id?: string; admin_password?: string };
    if (!body.place_id || !body.id) {
      return NextResponse.json({ message: '필수 값이 누락되었습니다.' }, { status: 400 });
    }

    const adminPassword = process.env.ADMIN_PASSWORD;
    if (adminPassword && body.admin_password !== adminPassword) {
      return NextResponse.json({ message: '관리자 인증에 실패했습니다.' }, { status: 403 });
    }

    const existing = commentsStore.get(body.place_id) ?? [];
    commentsStore.set(
      body.place_id,
      existing.filter((comment) => comment.id !== body.id),
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : '댓글 삭제에 실패했습니다.' },
      { status: 500 },
    );
  }
}
