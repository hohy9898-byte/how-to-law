// 회원 데이터가 조문을 가리키는 방식: (userId, lawId, articleKey)
// Provision id를 쓰지 않는 이유: law:import가 버전을 다시 넣으면 Provision id가 바뀐다.

export type ArticleRef = { userId: string; lawId: string; articleKey: string };

/** Prisma 복합 키 where 절 */
export const refWhere = ({ userId, lawId, articleKey }: ArticleRef) => ({
  userId_lawId_articleKey: { userId, lawId, articleKey },
});
