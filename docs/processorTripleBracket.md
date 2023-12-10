## 개요
삼중괄호 열기 문법을 처리합니다.

## 설명
삼중괄호 열기 문법은 Queue의 형태로 구현이 가능합니다.

```
(1) (2) (3) (4)
{{{ {{{ }}} }}}
```
처음으로, 1, 2는 Queue에 들어갑니다.\
그 다음 3에서 Queue의 마지막인 2와 대응시켜 연결합니다.\
그리고 남은 4에서 Queue의 마지막인 1과 대응시켜 연결합니다.\
이스케이프로 구현될 때, ```\{{{ text }}}```라면 ```{{{ text }}}```라는 일반 plain 텍스트로 나옵니다. 왜냐하면 삼중괄호로 묶인 열기, 닫기 문법은 무효화될 때 한번에 무효화되기 때문입니다.

## 구현
```ts
const tripleBracketQueue: HolderElem[] = [];
```
LIFO 구조입니다. 열기 문법만이 들어있습니다.
### 열기 문법
```ts
tripleBracketQueue.push(elem);
```
큐에 열기 문법을 집어넣습니다.

### 닫기 문법
```ts
const lastItem = tripleBracketQueue.pop();
```
tripleBracketQueue에서 마지막 아이템을 빼옵니다. 빼오는 동시에 마지막 아이템을 지웁니다.

```ts
if (lastItem === undefined) {
    elem.isObsolete = true;
    return;
}
```
마지막 아이템이 없을 경우, 무시됩니다.

```ts
const group: Group = lastItem.group.find(v => v instanceof TripleBracketContentGroup) ? new TripleBracketContentGroup() : new TripleBracketGroup();
this.pushGroup({ group, elems: [elem] })
```
마지막 아이템의 그룹 중 TripleBracketContentGroup(processorEscape 참고)이 포함되어 있다면, 계속해서 그 Group이 사용되고, 아니면 TripleBracketGroup이 사용됩니다.


