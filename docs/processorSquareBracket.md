## 개요
대괄호 문법을 처리합니다.

## 설명

## 구현
```ts
let squareBracketArray: { value: HolderElem[]; max: number }[] = [];
```
열기 문법만 들어있습니다. value는 인접 문법이며, max는 대응되는 닫기 문법의 대괄호 개수가 쌓인 정도입니다.

### 열기 문법
```ts
const adjBrackets = [elem];
let lastRange: Range = elem.range;
let bracketCount = 1; // 3 이상 부터는 모두 무쓸모
for (const subElem of this.holderArray.slice(props.idx + 1)) {
    if (subElem.type === "SquareBracketOpen" && lastRange.isAdjacent(subElem.range)) {
        bracketCount++;
        if (bracketCount > 2) {
            subElem.isObsolete = true;
        }
        adjBrackets.push(subElem);
        lastRange = subElem.range;
        continue;
    }
    break;
}
squareBracketArray.push({ value: adjBrackets, max: 0 });
```
인접한 brackets끼리 adjBrackets에 저장됩니다. 먼저 elem에 인접해야 하므로 elem이 먼저 저장됩니다.\
lastRange는 adjBrackets의 마지막 아이템의 range입니다.\
bracketCount는 adjBrackets의 개수입니다.\
이제 인접한 brackets을 찾아봅시다. SquareBracketOpen 타입에 lastRange와 인접한다면 "인접한 대괄호 열기 문법"이라는 조건에 부합합니다.\
하나씩 찾을 때마다 bracketCount가 1씩 늘어나며, 3 이상 부터는 무시됩니다.\
마지막으로 adjBrackets을 squareBracketArray에 대입합니다. 초기 max값은 0입니다.

```ts
// 인접한 bracket은 pass해도 됨
props.setIdx(props.idx + adjBrackets.length - 1);
```
인접한 열기 문법 brackets은 이미 처리되었으므로 건너뜁시다.

### 닫기 문법
```ts
const adjBrackets = [elem];

let lastRange: Range = elem.range;
let bracketCount = 1; // 3 이상 부터는 모두 무쓸모
for (const subElem of this.holderArray.slice(props.idx + 1)) {
    if (subElem.type === "SquareBracketClose" && lastRange.isAdjacent(subElem.range)) {
        bracketCount++;
        if (bracketCount > 2) {
            subElem.isObsolete = true;
        }
        adjBrackets.push(subElem);
        lastRange = subElem.range;
        continue;
    }
    break;
}
```
위의 열기 문법의 adjBrackets 저장 방법과 동일합니다.

```ts
const firstItem = squareBracketArray[0];
if (firstItem === undefined) {
    adjBrackets.forEach((v) => (v.isObsolete = true));
    // 인접한 bracket은 pass해도 됨
    props.setIdx(props.idx + adjBrackets.length - 1);
    return;
}
```
