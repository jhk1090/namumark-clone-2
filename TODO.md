# 245261

- 리스트 구현 (newindent)
 - structure의 count가 2(이상)일 경우 1 / 1로 나눌 것 (또는 1 / 1 / 0)
  - 나누고 나면 HolderElem에 원래 count가 2인 element는 지우고 그 자리에 1 / 1인 나눈 element를 넣을 것
 - processWhenDefined 구현할 것
  - processWhenDefined는 processWhenUndefined가 단순 트리 구조를 세우는 것과 다르게 한 element만 경로를 찾아서 첫 번째로 만든 트리에 넣는 방식으로 구현할 것
 - 트리 구조 설정 후 나머지는 middleGroupper에서 구현할 것
  - ul, ol, li 별로 그룹화하기

- table 구조 재구현
 - 리스트가 구현되었기 때문에 가능, 리스트와 엮인 테이블 구조는 개편이 필요함

 # NOTE

<!-- x> asf
x> asdfasdf
x asdf
xx asdf
xx* asdf
xxasdf

{
 m: 1
 s: [
 { t: cite, c: 0 },
 { t: cite, c: 0 },
 { t: indent, c: 0 },
 { t: indent, c: 1, s: [
  {t: indent, c: 0 }
  {t: list, c: 0, s: [
    {t: indent, c: 0 }
  ] }   
 ] }

 ]
}


x>xxx*asf
x>xasdfasdf
xasdf
xxasdf
xx*asdf
xxasdf


{
  m: 1
  s: [
    { t: cite, c: 0, s: [
      { t: list, c: 3 }
      { t: indent, c: 1 }
    ] }
    
    { t; indent, c: 0 }
    { t: indent, c: 1, s: [
      { t: indent, c: 0 }
      { t: list, c: 0, s: [
        { t: indent, c: 0 }
      ] }
    ] }
  ]
}

// 처리 안됨
>    *  asf
>          asdfasdf

// indent 처리됨
    *  asf
          asdfasdf

+++ ㄴㄴ 구분 없음 -->