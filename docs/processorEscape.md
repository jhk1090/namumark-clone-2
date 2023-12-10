## 개요
문법을 이스케이프 처리합니다.

## 설명
type이 Newline인 Holder는 이스케이프 처리 대상이 아닙니다.\
또한 type이 TripleBracket류일 경우 TripleBracketContentGroup이라는 특별한 group을 적용합니다.

## 구현
```ts
if (next.type === "Newline") {
    return;
}
```
type이 Newline인 Holder는 이스케이프 처리 대상이 아닙니다.\

```ts
if (elem.range.isAdjacent(next.range)) {
    this.pushGroup({ group: new (next.type === "TripleBracketOpen" ? TripleBracketContentGroup : ContentGroup)(), elems: [elem, next] });

    // 다음 text 건너뛰기
    if (next.type === "TripleBracketClose" || next.type === "TripleBracketOpen") {
        return;
    }

    props.setIdx(props.idx + 1);
}
```
이번 elem과 다음 elem이 인접할 경우 처리 대상에 포함됩니다.\
다음 elem의 type이 TripleBracketOpen일 경우, 그룹인 TripleBracketContentGroup을 사용합니다. 아니라면 일반 ContentGroup이 사용됩니다.\
\
다음으로 setIdx를 통해 다음 토큰이 무시되지만, 다음 type이 삼중괄호 형일 경우, 무시되지 않고 마무리 처리가 되야하므로, setIdx를 사용하지 않습니다.

