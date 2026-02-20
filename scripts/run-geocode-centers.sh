#!/bin/bash

# 교육원(training_centers) 좌표 일괄 변환 스크립트
# offset 없이 항상 null인 것 앞에서부터 100개씩 처리

BASE_URL="http://localhost:3000"
SECRET="batch-geocode-secret"
BATCH_SIZE=100

echo "====================================="
echo "교육원 좌표 변환 시작"
echo "배치당 ${BATCH_SIZE}건씩, null 없어질 때까지 반복"
echo "====================================="

ROUND=1

while true; do
  echo ""
  echo "[$(date '+%H:%M:%S')] 배치 ${ROUND}회 처리 중..."

  RESPONSE=$(curl -s -X POST "${BASE_URL}/api/geocode/batch" \
    -H "Content-Type: application/json" \
    -d "{\"secret\":\"${SECRET}\",\"limit\":${BATCH_SIZE},\"offset\":0}" \
    --max-time 60)

  CENTER_TOTAL=$(echo $RESPONSE | grep -o '"training_centers":{[^}]*"total":[0-9]*' | grep -o '"total":[0-9]*' | grep -o '[0-9]*')
  CENTER_SUCCESS=$(echo $RESPONSE | grep -o '"training_centers":{[^}]*"success":[0-9]*' | grep -o '"success":[0-9]*' | grep -o '[0-9]*')
  CENTER_FAILED=$(echo $RESPONSE | grep -o '"training_centers":{[^}]*"failed":[0-9]*' | grep -o '"failed":[0-9]*' | grep -o '[0-9]*')

  echo "  교육원: 총 ${CENTER_TOTAL:-0}건 처리 → 성공 ${CENTER_SUCCESS:-0}건 / 실패 ${CENTER_FAILED:-0}건"

  # 처리할 데이터가 없으면 종료
  if [ -z "$CENTER_TOTAL" ] || [ "$CENTER_TOTAL" -eq 0 ]; then
    echo ""
    echo "처리할 데이터가 없습니다. 완료!"
    break
  fi

  # 전부 실패(주소없음)면 더 이상 진행 안 함
  if [ "${CENTER_SUCCESS:-0}" -eq 0 ] && [ ! -z "$CENTER_FAILED" ]; then
    echo "  ⚠️  성공 0건 — 주소 없는 데이터만 남았습니다. 종료합니다."
    break
  fi

  ROUND=$((ROUND + 1))
  sleep 2
done

echo ""
echo "====================================="
echo "모든 배치 완료!"
echo "====================================="
