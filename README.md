## Namumark-clone-2

나무위키 엔진인 the seed의 파서 부분만 구현중입니다. (2번째 버전)\
구현 목록은 밑의 문단을 확인하세요.

### 구현 목록

 * [processorEscape](./docs/processorEscape.md) - 문법을 이스케이핑 처리합니다.
 * [processorTripleBracket](./docs/processorTripleBracket.md) - 삼중괄호 문법을 처리합니다.
 * [processorSquareBracket](./docs/processorSquareBracket.md) - 대괄호 문법을 처리합니다.
 * [processorHeading](./docs/processorHeading.md) - 문단 문법을 처리합니다.



```
[[date]ㅁㄴㅇㄹ[[ㅁㄴㅇㄹ]]
```

[[ (할당)

] (max = 1)

[[ (할당)

]] (max = 2)

```
[[date]ㅁ]]ㄴㅇㄹ[[ㅁㄴㅇㄹ]]
```

[[ (할당)

] (max = 1)

]] (max = 2)

[[ (할당)

]] (max = 2)

```
[[][date]
```

[[ ( char = [, max = 0, index = 0 )
] ( length > max -> max = 1 ) ( queue[1].group = singleGroup )
[ ( char = [, max = 0, index = 1 )
] ( length == max (x) )

```
 * asdf
  * asdf
  <- space(2)
  * asdf
 <- space(1)
 * asdf
```

