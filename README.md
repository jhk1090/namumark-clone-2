## Namumark-clone-2

나무위키 엔진인 the seed의 파서 부분만 구현중입니다. (2번째 버전)\
구현 목록은 밑의 문단을 확인하세요.

### 구현 목록

 * [processorEscape](./docs/processorEscape.md) - 문법을 이스케이핑 처리합니다.
 * [processorTripleBracket](./docs/processorTripleBracket.md) - 삼중괄호 문법을 처리합니다.
 * [processorSquareBracket](./docs/processorSquareBracket.md) - 대괄호 문법을 처리합니다.
 * [processorHeading](./docs/processorHeading.md) - 문단 문법을 처리합니다.

### indent 아이디어

```
;는 indent

;;{{{
;{{{text1
;;text2}}}
}}}
```

{{{ }}} bracket은 indent = 2;
text1은 indent = 1이지만, bracket의 영향으로 indent = 3;
text2는 indent = 2이지만, bracket의 영향으로 indent = 4;


eolHolderArray = [ Indent, Elem, Elem, Elem, Newline ]

