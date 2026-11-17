// =========================================================================
// [ep1_noah.js] 에피소드 1 : 노아의 방주 (스테이지 1 순간가속 회피·끼임 방지·광역 스폰, 스테이지 3 교차 점프·미로 추종)
// =========================================================================

EPISODE_SCRIPTURE.noah = {
  1: {
    title: '스테이지 1 클리어! 동물 7쌍 방주 탑승!',
    desc: '하나님께서 명하신 대로 모든 동물들을 방주 위에 안전하게 태웠어요!',
    verse: '"노아가 여호와께서 자기에게 명하신 대로 다 준행하였더라" (창세기 6장 22절)',
    btnText: '🌧️ 방주 안으로 들어가기 (스테이지 2) ▶',
    quiz: { q: '퀴즈! 노아는 하나님의 말씀에 어떻게 순종했나요?', opts: ['자기 마음대로 고쳤다', '명하신 대로 다 준행하였다', '절반만 만들고 포기했다'], ans: 1 }
  },
  2: {
    title: '스테이지 2 클리어! 감람나무 새 잎사귀!',
    desc: '창문으로 날려 보낸 하얀 비둘기가 저녁때에 감람나무 새 잎사귀를 물고 돌아왔어요!',
    verse: '"저녁때에 비둘기가 그에게로 돌아왔는데 그 입에 감람나무 새 잎사귀가 있는지라 이에 노아가 땅에 물이 줄어든 줄을 알았으며" (창세기 8장 11절)',
    btnText: '방주 출구 찾으러 가기 (스테이지 3) ▶',
    quiz: { q: '퀴즈! 비둘기가 입에 물고 돌아온 것은 무엇인가요?', opts: ['감람나무 새 잎사귀', '사과나무 열매', '황금 나뭇가지'], ans: 0 }
  },
  3: {
    title: '스테이지 3 클리어! 방주 문이 활짝 열렸어요!',
    desc: '노아를 졸졸 따라온 동물 7쌍과 함께 환한 빛을 지나 무지개 세상으로 나가요!',
    verse: '"내가 내 무지개를 구름 속에 두었나니 이것이 나와 세상 사이의 언약의 증거니라" (창세기 9장 13절)',
    btnText: '🌈 환한 빛을 지나 무지개 세상으로 나가기! ▶',
    quiz: { q: '퀴즈! 하나님께서 다시는 물로 심판하지 않겠다고 약속하시며 구름 속에 두신 증거는?', opts: ['일곱 빛깔 무지개', '번개와 구름', '황금 별자리'], ans: 0 }
  }
};

// 스테이지 3 노아 이동 궤적 기록 배열 및 방주 지붕/외부 바다 파도 배열
let noahStage3Trail = [];
let noahOuterSeaWaves = [];
window.noahArkCeilingGroup = null;

// -------------------------------------------------------------------------
// [공통 보조] 동물 7쌍 광역 분산 랜덤 스폰 (소년반은 구역별 분할 + 최대 이격 거리 보장)
// -------------------------------------------------------------------------
function pickWidelySpreadAnimalSpot(bounds, existingSpots, minSpacing, avoidPos, avoidRadius = 8.0, sectorBounds = null) {
  const activeBounds = sectorBounds || bounds;
  let bestSpot = null;
  let bestMinDist = -1;

  for (let attempt = 0; attempt < 180; attempt++) {
    const searchB = (attempt < 110) ? activeBounds : bounds;
    const rx = searchB.minX + Math.random() * (searchB.maxX - searchB.minX);
    const rz = searchB.minZ + Math.random() * (searchB.maxZ - searchB.minZ);

    if (avoidPos && Math.hypot(rx - avoidPos.x, rz - avoidPos.z) < avoidRadius) continue;
    if (currentStage === 1 && rz < -9.5 && Math.abs(rx) < 16.5) continue;
    if (!isSpawnSpotClear(rx, rz, 1.75)) continue;

    let nearestDist = 9999;
    for (const pt of existingSpots) {
      const d = Math.hypot(rx - pt[0], rz - pt[1]);
      if (d < nearestDist) nearestDist = d;
    }

    if (nearestDist > bestMinDist) {
      bestMinDist = nearestDist;
      bestSpot = [rx, rz];
    }

    if (nearestDist >= minSpacing && attempt >= 18) {
      return bestSpot;
    }
  }

  if (bestSpot) return bestSpot;
  return findRandomSafeSpot(bounds, existingSpots, minSpacing * 0.6, avoidPos, avoidRadius);
}

function buildSpreadSectors(bounds) {
  const midX = (bounds.minX + bounds.maxX) * 0.5;
  const zSpan = (bounds.maxZ - bounds.minZ) / 3;
  const z1 = bounds.minZ + zSpan;
  const z2 = bounds.minZ + zSpan * 2;
  const sectors = [
    { minX: bounds.minX, maxX: midX - 2, minZ: bounds.minZ, maxZ: z1 },
    { minX: midX + 2, maxX: bounds.maxX, minZ: bounds.minZ, maxZ: z1 },
    { minX: bounds.minX, maxX: midX - 4, minZ: z1, maxZ: z2 },
    { minX: midX + 4, maxX: bounds.maxX, minZ: z1, maxZ: z2 },
    { minX: bounds.minX, maxX: -bounds.maxX * 0.3, minZ: z2, maxZ: bounds.maxZ },
    { minX: -bounds.maxX * 0.3, maxX: bounds.maxX * 0.3, minZ: z2 + 2, maxZ: bounds.maxZ },
    { minX: bounds.maxX * 0.3, maxX: bounds.maxX, minZ: z2, maxZ: bounds.maxZ }
  ];
  return sectors.sort(() => Math.random() - 0.5);
}

// -------------------------------------------------------------------------
// [스테이지 1 보조] core.js의 isSpawnSpotClear를 재사용한 동물 반경 검사 & 조향 탐색
// -------------------------------------------------------------------------
function isStage1AnimalSpotClear(nx, nz, limit, radius = 1.25) {
  if (Math.abs(nx) > limit || nz > limit || nz < -10.2) return false;
  if (nz < -9.8 && Math.abs(nx) < 16.5) return false;
  return isSpawnSpotClear(nx, nz, radius);
}

function findBestAnimalSteerAngle(a, preferredAngle, awayFromNoahAngle, isFleeing, stepDist) {
  const curX = a.group.position.x;
  const curZ = a.group.position.z;
  const candidateOffsets = [
    0,
    0.42, -0.42,
    0.85, -0.85,
    1.28, -1.28,
    1.72, -1.72,
    2.18, -2.18,
    2.65, -2.65,
    Math.PI
  ];

  let bestAngle = null;
  let bestScore = -9999;

  for (const off of candidateOffsets) {
    const candAngle = preferredAngle + off;
    const testX = curX + Math.sin(candAngle) * stepDist;
    const testZ = curZ + Math.cos(candAngle) * stepDist;
    const lookAheadX = curX + Math.sin(candAngle) * (stepDist * 2.4);
    const lookAheadZ = curZ + Math.cos(candAngle) * (stepDist * 2.4);

    if (!isStage1AnimalSpotClear(testX, testZ, a.limit, 1.2)) continue;

    let score = Math.cos(off) * 2.5;

    if (isStage1AnimalSpotClear(lookAheadX, lookAheadZ, a.limit, 1.15)) {
      score += 2.2;
    }

    const diffFromAway = Math.atan2(Math.sin(candAngle - awayFromNoahAngle), Math.cos(candAngle - awayFromNoahAngle));
    if (isFleeing) {
      if (Math.abs(diffFromAway) > 1.83) {
        score -= 12.0;
      } else {
        score += Math.cos(diffFromAway) * 4.5;
      }
    } else {
      const distToNoah = Math.hypot(curX - playerPos.x, curZ - playerPos.z);
      if (distToNoah < 15.5 && Math.abs(diffFromAway) > 1.75) {
        score -= 5.0;
      }
    }

    for (const other of stageAnimals) {
      if (other === a || other.rescued) continue;
      const od = Math.hypot(testX - other.group.position.x, testZ - other.group.position.z);
      if (od < 4.8) {
        score -= (4.8 - od) * 2.5;
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestAngle = candAngle;
    }
  }

  return bestAngle;
}

// -------------------------------------------------------------------------
// [스테이지 3 보조] 미로 벽 모서리 겹침 방지 & 한 줄씩 번갈아 뛰는 대열 추종 헬퍼
// -------------------------------------------------------------------------
function getStage3CornerRepulsion(x, z, detectPad = 0.65) {
  let pushX = 0;
  let pushZ = 0;

  const checkBoxList = (list) => {
    for (const b of list) {
      if (b.topY !== undefined && b.topY < -100) continue;
      if (x > b.minX - detectPad && x < b.maxX + detectPad && z > b.minZ - detectPad && z < b.maxZ + detectPad) {
        const clampedX = Math.max(b.minX, Math.min(b.maxX, x));
        const clampedZ = Math.max(b.minZ, Math.min(b.maxZ, z));
        const dx = x - clampedX;
        const dz = z - clampedZ;
        const dist = Math.hypot(dx, dz);

        if (dist > 0.0001 && dist < detectPad) {
          const strength = (detectPad - dist) / detectPad;
          pushX += (dx / dist) * strength * 1.8;
          pushZ += (dz / dist) * strength * 1.8;
        }
      }
    }
  };

  checkBoxList(colliders);
  checkBoxList(platforms);
  return { pushX, pushZ };
}

function recordNoahStage3Trail() {
  const head = noahStage3Trail[0];
  if (!head || Math.hypot(playerPos.x - head.x, playerPos.z - head.z) >= 0.25) {
    const rep = getStage3CornerRepulsion(playerPos.x, playerPos.z, 0.55);
    let tx = playerPos.x + Math.max(-0.3, Math.min(0.3, rep.pushX * 0.16));
    let tz = playerPos.z + Math.max(-0.3, Math.min(0.3, rep.pushZ * 0.16));
    if (!isSpawnSpotClear(tx, tz, 0.35)) {
      tx = playerPos.x;
      tz = playerPos.z;
    }
    noahStage3Trail.unshift({ x: tx, z: tz });
    if (noahStage3Trail.length > 220) noahStage3Trail.pop();
  }
}

function getNoahTrailTargetPos(targetArcDist) {
  if (noahStage3Trail.length === 0) return { x: playerPos.x, z: playerPos.z };
  let accum = Math.hypot(playerPos.x - noahStage3Trail[0].x, playerPos.z - noahStage3Trail[0].z);
  if (accum >= targetArcDist) {
    const ratio = targetArcDist / Math.max(0.001, accum);
    return {
      x: THREE.MathUtils.lerp(playerPos.x, noahStage3Trail[0].x, ratio),
      z: THREE.MathUtils.lerp(playerPos.z, noahStage3Trail[0].z, ratio)
    };
  }
  for (let i = 0; i < noahStage3Trail.length - 1; i++) {
    const p0 = noahStage3Trail[i];
    const p1 = noahStage3Trail[i + 1];
    const segLen = Math.hypot(p1.x - p0.x, p1.z - p0.z);
    if (accum + segLen >= targetArcDist && segLen > 0.0001) {
      const r = (targetArcDist - accum) / segLen;
      return {
        x: THREE.MathUtils.lerp(p0.x, p1.x, r),
        z: THREE.MathUtils.lerp(p0.z, p1.z, r)
      };
    }
    accum += segLen;
  }
  const last = noahStage3Trail[noahStage3Trail.length - 1];
  return { x: last.x, z: last.z };
}

function applyAlternatingRowBounce(fa, idx, now) {
  // 짝수 줄(0, 2, 4, 6)과 홀수 줄(1, 3, 5)이 엔딩처럼 한 줄씩 번갈아가며 통통 뛰도록 위상차 부여
  const rowPhase = (idx % 2) * (Math.PI * 0.5);
  fa.group.position.y = Math.abs(Math.sin(now * 0.0065 + rowPhase)) * 0.42;
  if (fa.group.userData && fa.group.userData.a1 && fa.group.userData.a2) {
    fa.group.userData.a1.position.y = Math.abs(Math.sin(now * 0.009 + rowPhase)) * 0.16;
    fa.group.userData.a2.position.y = Math.abs(Math.cos(now * 0.009 + rowPhase)) * 0.16;
  }
}

function moveStage3FollowerSafely(fa, idx, targetX, targetZ, dt, now) {
  // 가만히 서 있을 때나 이동 중일 때 모두 한 줄씩 번갈아가며 점프 유지
  applyAlternatingRowBounce(fa, idx, now);

  const curX = fa.group.position.x;
  const curZ = fa.group.position.z;
  const dx = targetX - curX;
  const dz = targetZ - curZ;
  const dist = Math.hypot(dx, dz);

  if (dist <= 0.14) {
    return;
  }

  const moveRatio = Math.min(1, dist * 5.2 * dt);
  const stepDist = dist * moveRatio;

  const rep = getStage3CornerRepulsion(curX, curZ, 0.65);
  const desiredAng = Math.atan2(dx + rep.pushX * 0.35, dz + rep.pushZ * 0.35);

  const nx = curX + Math.sin(desiredAng) * stepDist;
  const nz = curZ + Math.cos(desiredAng) * stepDist;

  let movedDist = 0;
  let finalAng = Math.atan2(dx, dz);

  if (isSpawnSpotClear(nx, nz, 0.40)) {
    fa.group.position.x = nx;
    fa.group.position.z = nz;
    movedDist = stepDist;
  } else {
    const steerOffsets = [0.42, -0.42, 0.85, -0.85, 1.28, -1.28];
    for (const off of steerOffsets) {
      const testAng = finalAng + off;
      const tx = curX + Math.sin(testAng) * stepDist;
      const tz = curZ + Math.cos(testAng) * stepDist;
      if (isSpawnSpotClear(tx, tz, 0.36)) {
        fa.group.position.x = tx;
        fa.group.position.z = tz;
        finalAng = testAng;
        movedDist = stepDist;
        break;
      }
    }

    if (movedDist === 0) {
      const slideX = curX + dx * moveRatio;
      const slideZ = curZ + dz * moveRatio;
      if (isSpawnSpotClear(slideX, curZ, 0.34)) {
        movedDist = Math.abs(slideX - curX);
        fa.group.position.x = slideX;
      } else if (isSpawnSpotClear(curX, slideZ, 0.34)) {
        movedDist = Math.abs(slideZ - curZ);
        fa.group.position.z = slideZ;
      }
    }
  }

  if (movedDist < 0.005) {
    fa.stuckTimer = (fa.stuckTimer || 0) + dt;
    if (fa.stuckTimer > 0.30 || dist > 9.0) {
      fa.group.position.x = THREE.MathUtils.lerp(curX, targetX, 0.25);
      fa.group.position.z = THREE.MathUtils.lerp(curZ, targetZ, 0.25);
      fa.stuckTimer = 0;
    }
  } else {
    fa.stuckTimer = 0;
  }

  fa.heading = lerpAngle(fa.heading, finalAng, dt * 9.5);
  fa.group.rotation.y = fa.heading;
}

// -------------------------------------------------------------------------
// [방주 전용 텍스처 & 구조물 빌더]
// - 스테이지 1: 나무결 판자 무늬, 더 길쭉한 배 선체, 입체 나무 창문 & 덧창
// - 스테이지 2·3: 바닥과 뚜렷이 대비되는 밝은 호박색/삼나무 선박 판자 벽 무늬,
//   1인칭 전용 천장 지붕, 점프 시 보이는 드넓은 바깥 바다 세상
// -------------------------------------------------------------------------
function makeNoahArkWoodPlankTex(baseHex = '#a15822', grainHex = '#7c3f14', seamHex = '#3b1906', repX = 4, repY = 2) {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 128;
  const ctx = c.getContext('2d');

  ctx.fillStyle = baseHex;
  ctx.fillRect(0, 0, 256, 128);

  const plankRows = 4;
  const rowH = 128 / plankRows;
  for (let r = 0; r < plankRows; r++) {
    const py = r * rowH;
    // 판자별 미세 톤 변화
    ctx.fillStyle = (r % 2 === 0) ? baseHex : grainHex;
    ctx.globalAlpha = (r % 2 === 0) ? 0.18 : 0.28;
    ctx.fillRect(0, py, 256, rowH);
    ctx.globalAlpha = 1.0;

    // 상단 하이라이트 & 하단 그림자(클링커 선박 판자 겹침 입체감)
    ctx.fillStyle = 'rgba(255, 235, 195, 0.24)';
    ctx.fillRect(0, py + 2, 256, 3);
    ctx.fillStyle = 'rgba(25, 10, 2, 0.35)';
    ctx.fillRect(0, py + rowH - 5, 256, 3);

    // 수평 나뭇결 물결 무늬
    ctx.strokeStyle = grainHex;
    ctx.lineWidth = 1.5;
    for (let g = 0; g < 4; g++) {
      const gy = py + 6 + g * 6;
      ctx.beginPath();
      for (let x = 0; x <= 256; x += 16) {
        const wave = Math.sin((x * 0.05) + r * 1.7 + g) * 1.8;
        if (x === 0) ctx.moveTo(x, gy + wave);
        else ctx.lineTo(x, gy + wave);
      }
      ctx.stroke();
    }

    // 옹이(나무 매듭) 표현
    const knotX = ((r * 73 + 44) % 210) + 22;
    const knotY = py + rowH * 0.52;
    ctx.strokeStyle = seamHex;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.ellipse(knotX, knotY, 7, 3.2, 0, 0, Math.PI * 2);
    ctx.stroke();

    // 수평 판자 틈새(이음새)
    ctx.fillStyle = seamHex;
    ctx.fillRect(0, py, 256, 2.2);

    // 수직 판자 이음선 & 나무 못(treenail pegs)
    const joint1 = ((r * 96 + 48) % 224) + 16;
    const joint2 = (joint1 + 128) % 256;
    [joint1, joint2].forEach(jx => {
      ctx.fillStyle = seamHex;
      ctx.fillRect(jx, py, 2.2, rowH);
      ctx.fillStyle = '#451a03';
      ctx.fillRect(jx - 5, py + 6, 3, 3);
      ctx.fillRect(jx + 3, py + 6, 3, 3);
      ctx.fillRect(jx - 5, py + rowH - 9, 3, 3);
      ctx.fillRect(jx + 3, py + rowH - 9, 3, 3);
    });
  }

  // 세로 선체 보강 늑골(rib) 음영 줄무늬
  ctx.fillStyle = 'rgba(55, 22, 5, 0.22)';
  ctx.fillRect(0, 0, 8, 128);
  ctx.fillRect(124, 0, 8, 128);

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repX, repY);
  tex.magFilter = THREE.NearestFilter;
  return tex;
}

function makeDetailedArkPitchFloorTex(c1 = '#24130a', c2 = '#150a05') {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext('2d');
  ctx.fillStyle = c1;
  ctx.fillRect(0, 0, 128, 128);

  // 어두운 역청(pitch) 칠한 갑판 바닥 판자 무늬 (벽면과 확실한 명도·색상 대비)
  for (let y = 0; y < 128; y += 16) {
    ctx.fillStyle = (y % 32 === 0) ? c1 : c2;
    ctx.fillRect(0, y, 128, 16);
    ctx.fillStyle = '#090402';
    ctx.fillRect(0, y, 128, 2);
    ctx.fillStyle = 'rgba(90, 48, 24, 0.22)';
    ctx.fillRect(0, y + 4, 128, 2);
    const jx = ((y * 3) % 96) + 16;
    ctx.fillStyle = '#090402';
    ctx.fillRect(jx, y, 2, 16);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(18, 24);
  tex.magFilter = THREE.NearestFilter;
  return tex;
}

function makeNoahOceanWaterTex(repX = 18, repY = 18) {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#0284c7';
  ctx.fillRect(0, 0, 128, 128);

  for (let y = 0; y < 128; y += 16) {
    ctx.fillStyle = (y % 32 === 0) ? '#0369a1' : '#0ea5e9';
    ctx.fillRect(0, y, 128, 8);
    ctx.fillStyle = 'rgba(186, 230, 253, 0.42)';
    const wx = (y * 23) % 88;
    ctx.fillRect(wx, y + 2, 28, 3);
    ctx.fillRect((wx + 56) % 100, y + 10, 22, 2);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repX, repY);
  tex.magFilter = THREE.NearestFilter;
  return tex;
}

function createStage1ArkWoodenWindow(winW = 1.55, winH = 1.35, withShutters = true) {
  const g = new THREE.Group();
  const frameMat = matVoxel('#5c2808', '#3b1704');
  const shutterMat = matVoxel('#b45309', '#78350f');
  const paneGlowMat = new THREE.MeshBasicMaterial({ color: 0xfef3c7 });
  const paneRecessMat = matVoxel('#291509', '#1c0d06');

  // 창문 안쪽 공간 + 은은한 등불 빛
  g.add(
    createBox(winW - 0.16, winH - 0.16, 0.16, paneRecessMat, 0, 0, 0, false),
    createBox(winW - 0.34, winH - 0.34, 0.18, paneGlowMat, 0, 0, 0.01, false)
  );
  // 나무 창틀 (상·하·좌·우) + 십자 나무 창살(mullion)
  g.add(
    createBox(winW + 0.18, 0.18, 0.28, frameMat, 0, winH / 2, 0.04, false),
    createBox(winW + 0.26, 0.22, 0.34, frameMat, 0, -winH / 2, 0.06, false),
    createBox(0.18, winH, 0.28, frameMat, -winW / 2, 0, 0.04, false),
    createBox(0.18, winH, 0.28, frameMat, winW / 2, 0, 0.04, false),
    createBox(0.12, winH - 0.2, 0.24, frameMat, 0, 0, 0.05, false),
    createBox(winW - 0.2, 0.12, 0.24, frameMat, 0, 0, 0.05, false)
  );
  if (withShutters) {
    const lShutter = createBox(0.42, winH - 0.06, 0.12, shutterMat, -winW / 2 - 0.24, 0, 0.10, false);
    lShutter.rotation.y = -0.35;
    const rShutter = createBox(0.42, winH - 0.06, 0.12, shutterMat, winW / 2 + 0.24, 0, 0.10, false);
    rShutter.rotation.y = 0.35;
    g.add(lShutter, rShutter);
  }
  return g;
}

function buildDetailedStage1NoahArk(arkZ = -19) {
  const hullW = 24.8;
  const hullH = 6.2;
  const hullD = 9.8;

  const hullWoodMat = new THREE.MeshLambertMaterial({
    map: makeNoahArkWoodPlankTex('#9a5220', '#733810', '#381705', 7, 2)
  });
  const cabinWoodMat = new THREE.MeshLambertMaterial({
    map: makeNoahArkWoodPlankTex('#b86828', '#8a4816', '#421b06', 5, 1)
  });
  const deckWoodMat = new THREE.MeshLambertMaterial({
    map: makeNoahArkWoodPlankTex('#c97a32', '#935119', '#4a2008', 6, 3)
  });
  const darkTimberMat = matVoxel('#5c2808', '#3e1a05');
  const trimTimberMat = matVoxel('#d97706', '#92400e');
  const roofTimberMat = matVoxel('#78350f', '#451a03');

  // 1) 길쭉한 메인 선체 + 좌우 뱃머리(선수)·고물(선미) 테이퍼 구조
  const arkHull = createBox(hullW, hullH, hullD, hullWoodMat, 0, hullH / 2, arkZ);
  const bowStep1L = createBox(2.2, hullH - 0.3, hullD * 0.76, hullWoodMat, -(hullW / 2 + 1.0), (hullH - 0.3) / 2 + 0.15, arkZ);
  const bowStep2L = createBox(1.8, hullH - 0.8, hullD * 0.48, hullWoodMat, -(hullW / 2 + 2.8), (hullH - 0.8) / 2 + 0.4, arkZ);
  const bowProwL = createBox(0.9, hullH + 1.4, 1.4, darkTimberMat, -(hullW / 2 + 3.9), (hullH + 1.4) / 2 + 0.3, arkZ);

  const sternStep1R = createBox(2.2, hullH - 0.3, hullD * 0.76, hullWoodMat, (hullW / 2 + 1.0), (hullH - 0.3) / 2 + 0.15, arkZ);
  const sternStep2R = createBox(1.8, hullH - 0.8, hullD * 0.48, hullWoodMat, (hullW / 2 + 2.8), (hullH - 0.8) / 2 + 0.4, arkZ);
  const sternProwR = createBox(0.9, hullH + 1.4, 1.4, darkTimberMat, (hullW / 2 + 3.9), (hullH + 1.4) / 2 + 0.3, arkZ);

  worldGroup.add(arkHull, bowStep1L, bowStep2L, bowProwL, sternStep1R, sternStep2R, sternProwR);
  wallMeshes.push(arkHull, bowStep1L, sternStep1R);

  // 2) 선체 외벽 수평 띠목(wale timbers) & 수직 늑골 기둥(hull ribs)
  [1.1, 3.1, 5.3].forEach(by => {
    const waleF = createBox(hullW + 0.3, 0.28, 0.28, darkTimberMat, 0, by, arkZ + hullD / 2 + 0.1, false);
    const waleB = createBox(hullW + 0.3, 0.28, 0.28, darkTimberMat, 0, by, arkZ - hullD / 2 - 0.1, false);
    worldGroup.add(waleF, waleB);
  });

  [-11.2, -7.6, -3.8, 3.8, 7.6, 11.2].forEach(rx => {
    const ribF = createBox(0.36, hullH, 0.32, darkTimberMat, rx, hullH / 2, arkZ + hullD / 2 + 0.12, false);
    const ribB = createBox(0.36, hullH, 0.32, darkTimberMat, rx, hullH / 2, arkZ - hullD / 2 - 0.12, false);
    worldGroup.add(ribF, ribB);
  });

  // 3) 상부 갑판 + 갑판 난간 + 길쭉한 상층 선실(cabin) & 박공 나무 지붕
  const arkDeck = createBox(hullW + 2.4, 0.45, hullD + 0.8, deckWoodMat, 0, 6.4, arkZ);
  const railBack = createBox(hullW + 2.2, 0.55, 0.28, trimTimberMat, 0, 6.85, arkZ - hullD / 2 - 0.2, false);
  const railFrontL = createBox(9.2, 0.55, 0.28, trimTimberMat, -8.6, 6.85, arkZ + hullD / 2 + 0.2, false);
  const railFrontR = createBox(9.2, 0.55, 0.28, trimTimberMat, 8.6, 6.85, arkZ + hullD / 2 + 0.2, false);

  const cabinW = 19.6, cabinH = 2.35, cabinD = 4.5, cabinZ = arkZ - 1.85;
  const arkCabin = createBox(cabinW, cabinH, cabinD, cabinWoodMat, 0, 7.75, cabinZ);
  const roofLower = createBox(cabinW + 1.0, 0.38, cabinD + 0.9, roofTimberMat, 0, 9.1, cabinZ);
  const roofUpper = createBox(cabinW + 0.3, 0.36, cabinD * 0.62, darkTimberMat, 0, 9.45, cabinZ);
  const roofRidge = createBox(cabinW + 0.6, 0.26, 0.55, trimTimberMat, 0, 9.74, cabinZ);

  worldGroup.add(arkDeck, railBack, railFrontL, railFrontR, arkCabin, roofLower, roofUpper, roofRidge);
  wallMeshes.push(arkCabin, roofLower);

  // 4) 선체 정면·후면 나무 창문(덧창 포함) + 상층 선실 채광 나무 창문
  [-9.4, -5.6, 5.6, 9.4].forEach(wx => {
    const winFront = createStage1ArkWoodenWindow(1.6, 1.35, true);
    winFront.position.set(wx, 4.15, arkZ + hullD / 2 + 0.08);
    const winBack = createStage1ArkWoodenWindow(1.6, 1.35, true);
    winBack.position.set(wx, 4.15, arkZ - hullD / 2 - 0.08);
    winBack.rotation.y = Math.PI;
    worldGroup.add(winFront, winBack);
  });

  [-7.2, -3.6, 0, 3.6, 7.2].forEach(cwx => {
    const topWinF = createStage1ArkWoodenWindow(1.35, 1.05, false);
    topWinF.position.set(cwx, 7.8, cabinZ + cabinD / 2 + 0.06);
    const topWinB = createStage1ArkWoodenWindow(1.35, 1.05, false);
    topWinB.position.set(cwx, 7.8, cabinZ - cabinD / 2 - 0.06);
    topWinB.rotation.y = Math.PI;
    worldGroup.add(topWinF, topWinB);
  });

  // 5) 정면 중앙 대형 방주 나무 출입문 & 미끄럼 방지 가로목 탑승 경사로
  const doorFrame = createBox(4.2, 4.3, 0.32, darkTimberMat, 0, 2.35, arkZ + hullD / 2 + 0.08, false);
  const doorLeafL = createBox(1.75, 3.85, 0.36, cabinWoodMat, -0.92, 2.25, arkZ + hullD / 2 + 0.12, false);
  const doorLeafR = createBox(1.75, 3.85, 0.36, cabinWoodMat, 0.92, 2.25, arkZ + hullD / 2 + 0.12, false);
  const ramp = createBox(4.4, 0.4, 6.2, deckWoodMat, 0, 0.3, arkZ + 7.0);
  const rampRailL = createBox(0.28, 0.65, 6.2, darkTimberMat, -2.1, 0.62, arkZ + 7.0, false);
  const rampRailR = createBox(0.28, 0.65, 6.2, darkTimberMat, 2.1, 0.62, arkZ + 7.0, false);
  worldGroup.add(doorFrame, doorLeafL, doorLeafR, ramp, rampRailL, rampRailR);
  for (let rz = arkZ + 4.4; rz <= arkZ + 9.6; rz += 1.05) {
    worldGroup.add(createBox(3.9, 0.12, 0.2, darkTimberMat, 0, 0.54, rz, false));
  }

  colliders.push({ minX: -15.8, maxX: 15.8, minZ: arkZ - 5.6, maxZ: arkZ + 7.5 });
}

function buildArkExteriorOceanWorld(halfW, halfD, wallH) {
  noahOuterSeaWaves = [];
  const seaY = 2.35; // 점프 시 미로 벽 너머로 한눈에 내려다보이는 출렁이는 해수면 높이
  const seaSpan = 280;

  const waterMatN = new THREE.MeshLambertMaterial({ map: makeNoahOceanWaterTex(28, 16) });
  const waterMatS = new THREE.MeshLambertMaterial({ map: makeNoahOceanWaterTex(28, 16) });
  const waterMatLR = new THREE.MeshLambertMaterial({ map: makeNoahOceanWaterTex(14, 24) });
  const deepHorizonMat = new THREE.MeshBasicMaterial({ color: 0x0369a1 });

  // 방주 사방을 빈틈없이 둘러싼 망망대해 수면
  const northSea = createBox(halfW * 2 + seaSpan * 2, 1.6, seaSpan, waterMatN, 0, seaY - 0.8, -halfD - seaSpan / 2 - 0.8, false);
  const southSea = createBox(halfW * 2 + seaSpan * 2, 1.6, seaSpan, waterMatS, 0, seaY - 0.8, halfD + seaSpan / 2 + 0.8, false);
  const westSea = createBox(seaSpan, 1.6, halfD * 2 + 4, waterMatLR, -halfW - seaSpan / 2 - 0.8, seaY - 0.8, 0, false);
  const eastSea = createBox(seaSpan, 1.6, halfD * 2 + 4, waterMatLR, halfW + seaSpan / 2 + 0.8, seaY - 0.8, 0, false);
  worldGroup.add(northSea, southSea, westSea, eastSea);

  // 방주 외벽 바깥쪽 배 현측(gunwale) 및 뱃머리·고물 곡선 목재 구조물
  const outerHullMat = matVoxel('#5c2808', '#3b1704');
  const outerRailMat = matVoxel('#92400e', '#78350f');
  worldGroup.add(
    createBox(halfW * 2 + 4.4, 1.2, 1.2, outerHullMat, 0, wallH - 0.5, -halfD - 1.2, false),
    createBox(halfW * 2 + 4.4, 1.2, 1.2, outerHullMat, 0, wallH - 0.5, halfD + 1.2, false),
    createBox(1.2, 1.2, halfD * 2 + 4.4, outerHullMat, -halfW - 1.2, wallH - 0.5, 0, false),
    createBox(1.2, 1.2, halfD * 2 + 4.4, outerHullMat, halfW + 1.2, wallH - 0.5, 0, false),
    // 북쪽(선수) & 남쪽(선미) 뾰족한 배 모양 연장부
    createBox(halfW * 1.35, wallH * 0.78, 5.5, outerRailMat, 0, wallH * 0.39, -halfD - 4.2, false),
    createBox(halfW * 0.72, wallH * 0.85, 5.5, outerHullMat, 0, wallH * 0.42, -halfD - 9.2, false),
    createBox(2.4, wallH + 2.8, 3.2, outerHullMat, 0, (wallH + 2.8) / 2, -halfD - 12.5, false),
    createBox(halfW * 1.35, wallH * 0.78, 5.5, outerRailMat, 0, wallH * 0.39, halfD + 4.2, false),
    createBox(halfW * 0.72, wallH * 0.85, 5.5, outerHullMat, 0, wallH * 0.42, halfD + 9.2, false),
    createBox(2.4, wallH + 2.4, 3.2, outerHullMat, 0, (wallH + 2.4) / 2, halfD + 12.5, false)
  );

  // 출렁이는 입체 파도 마루 & 하얀 물보라(whitecaps)
  const waveCrestMat = new THREE.MeshLambertMaterial({ color: 0x38bdf8 });
  const waveFoamMat = new THREE.MeshBasicMaterial({ color: 0xe0f2fe });
  for (let i = 0; i < 64; i++) {
    const side = i % 4;
    const distOut = 7 + (Math.floor(i / 4) * 5.8) + (i % 3) * 2.2;
    const along = ((i * 19) % 100 - 50) * 1.65;
    let wx = 0, wz = 0, wLen = 9 + (i % 4) * 3.5, wThick = 1.6;
    if (side === 0) { wx = along; wz = -halfD - distOut - 8; }
    else if (side === 1) { wx = along; wz = halfD + distOut + 8; }
    else if (side === 2) { wx = -halfW - distOut; wz = along; }
    else { wx = halfW + distOut; wz = along; }

    const wg = new THREE.Group();
    const isEW = (side >= 2);
    const crest = createBox(isEW ? wThick : wLen, 0.45, isEW ? wLen : wThick, waveCrestMat, 0, 0, 0, false);
    const foam = createBox(isEW ? wThick * 0.65 : wLen * 0.82, 0.22, isEW ? wLen * 0.82 : wThick * 0.65, waveFoamMat, 0, 0.28, 0, false);
    wg.add(crest, foam);
    wg.position.set(wx, seaY + 0.12, wz);
    worldGroup.add(wg);
    noahOuterSeaWaves.push({ mesh: wg, baseX: wx, baseY: seaY + 0.12, baseZ: wz, phase: i * 0.55, isEW });
  }

  // 수평선 너머 구름 띠 (온통 물인 대홍수 바다 세상 분위기)
  if (typeof createFluffyCloudGroup === 'function') {
    const cloudCoords = [
      [-halfW - 35, 22, -30], [halfW + 35, 24, -25],
      [-halfW - 40, 21, 28],  [halfW + 40, 23, 30],
      [-28, 25, -halfD - 42], [28, 24, -halfD - 38],
      [-26, 23, halfD + 40],  [26, 25, halfD + 42]
    ];
    cloudCoords.forEach(([cx, cy, cz], idx) => {
      const cl = createFluffyCloudGroup(1.25 + (idx % 2) * 0.25, false);
      cl.position.set(cx, cy, cz);
      worldGroup.add(cl);
    });
  }
  worldGroup.add(createBox(700, 0.5, 700, deepHorizonMat, 0, seaY - 1.9, 0, false));
}

function buildArkInteriorCeilingGroup(halfW, halfD, wallH) {
  const ceilingGroup = new THREE.Group();
  const ceilTex = makeNoahArkWoodPlankTex('#7c3f14', '#5c2b09', '#2b1103', 14, 18);
  const ceilMat = new THREE.MeshLambertMaterial({ map: ceilTex });
  const beamMat = matVoxel('#451a03', '#290f02');

  // 천장 목재 갑판 덮개
  const roofSlab = createBox(halfW * 2 + 3, 0.55, halfD * 2 + 3, ceilMat, 0, wallH + 0.55, 0, false);
  ceilingGroup.add(roofSlab);

  // 1인칭 시점에서 올려다볼 때 입체감이 살아나는 가로·세로 대들보(서까래)
  for (let z = -halfD + 6; z <= halfD - 6; z += 8.5) {
    ceilingGroup.add(createBox(halfW * 2 + 1, 0.42, 0.65, beamMat, 0, wallH + 0.12, z, false));
  }
  [-halfW * 0.5, 0, halfW * 0.5].forEach(bx => {
    ceilingGroup.add(createBox(0.7, 0.46, halfD * 2 + 1, beamMat, bx, wallH + 0.1, 0, false));
  });

  // [요청사항] 1인칭 시점('fps')일 때만 지붕이 보이도록 설정
  ceilingGroup.visible = (window.globalCameraViewMode === 'fps');
  window.noahArkCeilingGroup = ceilingGroup;
  worldGroup.add(ceilingGroup);
}

// -------------------------------------------------------------------------
// [스테이지 1] 초원 월드 & 동물 7쌍 랜덤 스폰
// -------------------------------------------------------------------------
function buildNoahStage1World() {
  clearWorld();
  noahOuterSeaWaves = [];
  window.noahArkCeilingGroup = null;
  scene.background = new THREE.Color(0x7dd3fc);
  scene.fog = new THREE.Fog(0x7dd3fc, 52, 135);

  const isWide = (currentMode !== 'kinder');
  const isHardSpread = (currentMode === 'senior' || currentMode === 'timeattack');
  const mapLimit = isWide ? 52 : 34;

  const groundMat = new THREE.MeshLambertMaterial({ map: makeGrassFieldTex() });
  worldGroup.add(createBox(mapLimit * 2.5, 1, mapLimit * 2.5, groundMat, 0, -0.5, 0));
  scatterMeadowGrassTufts(mapLimit);
  buildGrassAndTreeBorders(mapLimit, false);

  const arkZ = -19;
  buildDetailedStage1NoahArk(arkZ);

  const rockSpots = isWide
    ? [[-13, 3], [13, 3], [-19, -6], [19, -6], [0, 21], [-24, 17], [24, 17], [-35, 6], [35, 6], [-28, 34], [28, 34]]
    : [[-13, 3], [13, 3], [-19, -6], [19, -6], [0, 21], [-24, 17], [24, 17]];
  rockSpots.forEach(([rx, rz]) => {
    addJumpRock(rx, rz, 4.2, 1.15, 4.2);
    addJumpRock(rx, rz, 2.5, 2.25, 2.5);
  });

  const innerTrees = [
    [-9, 11], [9, 11], [-16, 15], [16, 15], [-21, 2], [21, 2],
    [-17, -11], [17, -11], [-27, 9], [27, 9], [0, 29],
    [-6, 24], [6, 24], [-18, 24], [18, 24], [-25, -4], [25, -4]
  ];
  innerTrees.forEach(([tx, tz]) => {
    if (Math.abs(tx) < mapLimit - 3 && Math.abs(tz) < mapLimit - 3) addTree(tx, tz, 1.1, true);
  });

  if (isWide) {
    const outerEdgeTrees = [
      [-34, -22], [-42, -16], [-38, -6], [-45, 4], [-35, 14], [-44, 22], [-36, 30], [-45, 38], [-38, 45],
      [34, -22],  [42, -16],  [38, -6],  [45, 4],  [35, 14],  [44, 22],  [36, 30],  [45, 38],  [38, 45],
      [-28, 38], [-20, 44], [-12, 37], [-4, 45], [5, 44], [13, 37], [21, 45], [29, 39],
      [-24, 47], [0, 38], [24, 47], [-10, 47], [10, 47],
      [-44, -28], [-35, -34], [-26, -28], [-18, -36], [-28, -43], [-16, -45], [-42, -40],
      [44, -28],  [35, -34],  [26, -28],  [18, -36],  [28, -43],  [16, -45],  [42, -40],
      [-6, -35], [6, -35], [0, -43], [-8, -45], [8, -45]
    ];
    outerEdgeTrees.forEach(([tx, tz], idx) => {
      const jx = tx + ((idx % 3) - 1) * 1.2, jz = tz + (((idx * 2) % 3) - 1) * 1.2;
      if (Math.abs(jx) < mapLimit - 3.2 && Math.abs(jz) < mapLimit - 3.2 && isSpawnSpotClear(jx, jz, 1.4)) {
        addTree(jx, jz, 1.05 + (idx % 3) * 0.14, true);
      }
    });
  }

  const types = ['lion', 'sheep', 'elephant', 'giraffe', 'panda', 'rabbit', 'deer'];
  const spawnRange = isWide ? (mapLimit - 6.5) : 20;
  const spawnBounds = { minX: -spawnRange, maxX: spawnRange, minZ: -8.5, maxZ: spawnRange };
  const sectors = isHardSpread ? buildSpreadSectors(spawnBounds) : null;
  const chosenSpots = [];
  const startPos = { x: 0, z: 6 };

  rescuedPairs = 0;
  types.forEach((type, i) => {
    const minSpacing = isHardSpread ? 19.5 : (isWide ? 11.0 : 6.0);
    const avoidRad = isHardSpread ? 11.5 : 7.0;
    const [ax, az] = pickWidelySpreadAnimalSpot(
      spawnBounds,
      chosenSpots,
      minSpacing,
      startPos,
      avoidRad,
      sectors ? sectors[i % sectors.length] : null
    );
    chosenSpots.push([ax, az]);
    const pairGroup = createAnimalPairGroup(type, 0xfde047);
    pairGroup.position.set(ax, 0, az);
    worldGroup.add(pairGroup);

    const initHeading = (i / types.length) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
    const lbl = createWorldLabel(`${ANIMAL_SPECS[type].icon} ${ANIMAL_SPECS[type].name} 한 쌍`);
    const speedScale = 0.90 + (i % 4) * 0.07;
    const fleeBias = ((i % 2 === 0 ? 1 : -1) * (0.18 + (i % 3) * 0.11));

    stageAnimals.push({
      type, index: i, group: pairGroup, rescued: false, onArkDeck: false, label: lbl,
      heading: initHeading, targetHeading: initHeading,
      avoidTimer: 0, wanderTimer: 1.2 + (i * 0.4), stuckTimer: 0,
      dashTimer: 0, dashCooldown: 0,
      fleeState: false, limit: mapLimit - 6,
      speedScale, fleeBias
    });
  });

  playerPos.set(0, 0, 6);
  playerVelY = 0; isGrounded = true; playerFacing = 0;
  cameraYaw = 0; cameraTargetYaw = 0;
  snapCameraToPlayer();
  updateStageHUD();
}

// -------------------------------------------------------------------------
// [스테이지 2 & 3] 방주 내부 랜덤 미로 생성기
// -------------------------------------------------------------------------
function buildNoahArkInteriorMaze(stageNum) {
  clearWorld();
  noahStage3Trail = [];
  mazeRunCount++;
  // 점프 시 방주 바깥 풍경이 온통 물인 바다 세상으로 보이도록 하늘/안개 및 외부 바다 생성
  scene.background = new THREE.Color(0x38bdf8);
  scene.fog = new THREE.Fog(0x38bdf8, 68, 220);

  const isHard = (currentMode === 'senior' || currentMode === 'timeattack');
  const halfW = isHard ? 36 : 26, halfD = isHard ? 48 : 34, wallH = 6.2;

  // 바닥(짙은 역청 고동색)과 미로 벽(따뜻한 밝은 황금 호박색/삼나무 선박 판자)의 뚜렷한 색상 대비
  const floorTex = stageNum === 2
    ? makeDetailedArkPitchFloorTex('#24130a', '#160b05')
    : makeDetailedArkPitchFloorTex('#1e1510', '#120c08');
  const floorMat = new THREE.MeshLambertMaterial({ map: floorTex });
  const topTrimMat = matVoxel(stageNum === 2 ? '#fbbf24' : '#f59e0b', '#92400e');
  const ribPostMat = matVoxel('#6b2f0a', '#451a03');

  worldGroup.add(createBox(halfW * 2, 1, halfD * 2, floorMat, 0, -0.5, 0));

  // 방주 바깥 사방 바다 풍경 & 1인칭 시점 전용 지붕 생성
  buildArkExteriorOceanWorld(halfW, halfD, wallH);
  buildArkInteriorCeilingGroup(halfW, halfD, wallH);

  const wallBaseHex = stageNum === 2 ? '#d99548' : '#e0a254';
  const wallGrainHex = stageNum === 2 ? '#9a581c' : '#a36120';
  const wallSeamHex = '#421b06';

  function addMazeWall(x, z, w, d) {
    if (w <= 0.4 || d <= 0.4) return;
    const spanLen = Math.max(w, d);
    const repeatX = Math.max(1, Math.round(spanLen / 4.2));
    const segWallTex = makeNoahArkWoodPlankTex(wallBaseHex, wallGrainHex, wallSeamHex, repeatX, 2);
    const segWallMat = new THREE.MeshLambertMaterial({ map: segWallTex });

    const m = createBox(w, wallH, d, segWallMat, x, wallH / 2, z);
    const trim = createBox(w + 0.12, 0.30, d + 0.12, topTrimMat, x, wallH + 0.15, z, false);
    const basePlinth = createBox(w + 0.10, 0.28, d + 0.10, ribPostMat, x, 0.14, z, false);
    worldGroup.add(m, trim, basePlinth);
    wallMeshes.push(m);

    // 배의 나무 벽 느낌을 살리는 양끝 및 중간 선체 나무 기둥(늑골 프레임)
    if (w >= d && w >= 4.0) {
      const postCount = Math.max(2, Math.floor(w / 6.5) + 1);
      for (let i = 0; i < postCount; i++) {
        const px = (x - w / 2 + 0.25) + (i / (postCount - 1)) * (w - 0.5);
        const post = createBox(0.32, wallH + 0.1, d + 0.16, ribPostMat, px, wallH / 2, z, false);
        worldGroup.add(post);
      }
    } else if (d > w && d >= 4.0) {
      const postCount = Math.max(2, Math.floor(d / 6.5) + 1);
      for (let i = 0; i < postCount; i++) {
        const pz = (z - d / 2 + 0.25) + (i / (postCount - 1)) * (d - 0.5);
        const post = createBox(w + 0.16, wallH + 0.1, 0.32, ribPostMat, x, wallH / 2, pz, false);
        worldGroup.add(post);
      }
    }

    colliders.push({ minX: x - w / 2 - 0.38, maxX: x + w / 2 + 0.38, minZ: z - d / 2 - 0.38, maxZ: z + d / 2 + 0.38 });
  }

  addMazeWall(0, -halfD, halfW * 2 + 2, 1.5);
  addMazeWall(0, halfD, halfW * 2 + 2, 1.5);
  addMazeWall(-halfW, 0, 1.5, halfD * 2 + 2);
  addMazeWall(halfW, 0, 1.5, halfD * 2 + 2);

  function addBarrierWithGates(z, gateCenters, gapWidth = 10.4) {
    const sorted = [...gateCenters].sort((a, b) => a - b);
    let curX = -halfW;
    sorted.forEach(gx => {
      const gLeft = Math.max(-halfW + 1.5, gx - gapWidth / 2);
      const gRight = Math.min(halfW - 1.5, gx + gapWidth / 2);
      if (gLeft > curX + 0.8) {
        const segW = gLeft - curX;
        addMazeWall(curX + segW / 2, z, segW, 1.4);
      }
      addWallTorch(gLeft - 0.7, 3.3, z + 0.85);
      addWallTorch(gRight + 0.7, 3.3, z + 0.85);
      curX = Math.max(curX, gRight);
    });
    if (halfW > curX + 0.8) {
      const segW = halfW - curX;
      addMazeWall(curX + segW / 2, z, segW, 1.4);
    }
  }

  const rows = isHard ? 5 : 4;
  const safeStartZ = halfD - 14, safeEndZ = -halfD + 13, spanZ = (safeStartZ - safeEndZ) / rows;
  const laneRatios = [-0.66, -0.33, 0, 0.33, 0.66];
  let prevLaneIdx = 2;

  for (let r = 0; r < rows; r++) {
    const z = safeStartZ - r * spanZ, midZ = z - spanZ * 0.5, subWallD = spanZ * 0.36;
    const candidateLanes = [0, 1, 2, 3, 4].filter(idx => idx !== prevLaneIdx);
    const primaryLane = candidateLanes[(mazeRunCount + r * 2 + Math.floor(Math.random() * candidateLanes.length)) % candidateLanes.length];
    prevLaneIdx = primaryLane;
    const jitter = (Math.random() - 0.5) * (halfW * 0.12);
    const gate1X = laneRatios[primaryLane] * halfW + jitter;

    if (stageNum === 2) {
      if ((r + mazeRunCount) % 3 === 1) {
        const secondLane = (primaryLane + 2 + (mazeRunCount % 2)) % 5;
        addBarrierWithGates(z, [gate1X, laneRatios[secondLane] * halfW], 10.2);
      } else {
        addBarrierWithGates(z, [gate1X], 10.6);
      }
      const chamberPattern = (mazeRunCount + r + Math.floor(Math.random() * 4)) % 4;
      if (chamberPattern === 0) {
        const p1 = -halfW * (0.25 + Math.random() * 0.15), p2 = halfW * (0.25 + Math.random() * 0.15);
        addMazeWall(p1, midZ, 1.4, subWallD); addMazeWall(p2, midZ, 1.4, subWallD);
        addWallTorch(p1, 3.3, midZ); addWallTorch(p2, 3.3, midZ);
      } else if (chamberPattern === 1) {
        const cx = (Math.random() < 0.5 ? -1 : 1) * (halfW * 0.18);
        addMazeWall(cx, midZ, halfW * 0.42, 1.5); addMazeWall(cx, midZ, 1.5, subWallD);
      } else if (chamberPattern === 2) {
        [-0.48, 0, 0.48].forEach(ratio => addMazeWall(ratio * halfW, midZ, 2.2, subWallD));
      } else {
        addMazeWall(-halfW * 0.42, midZ, halfW * 0.32, 1.5); addMazeWall(halfW * 0.42, midZ, halfW * 0.32, 1.5);
      }
    } else {
      const st3Pattern = (mazeRunCount * 2 + r + Math.floor(Math.random() * 4)) % 4;
      if (st3Pattern === 0) {
        const openSide = (primaryLane < 2) ? -1 : 1;
        addBarrierWithGates(z, [openSide * (halfW - 7.2)], 10.6);
        addMazeWall(-openSide * (halfW * 0.15), midZ, halfW * 0.56, 1.8);
      } else if (st3Pattern === 1) {
        addBarrierWithGates(z, [-halfW * 0.52, halfW * 0.52], 10.2);
        addMazeWall(-halfW * 0.24, midZ, 3.2, subWallD); addMazeWall(halfW * 0.24, midZ, 3.2, subWallD);
      } else if (st3Pattern === 2) {
        addBarrierWithGates(z, [jitter], 10.8);
        addMazeWall(-halfW * 0.48, midZ, 2.2, subWallD); addMazeWall(halfW * 0.48, midZ, 2.2, subWallD);
      } else {
        const gA = (r % 2 === 0 ? -0.55 : -0.22) * halfW, gB = (r % 2 === 0 ? 0.22 : 0.55) * halfW;
        addBarrierWithGates(z, [gA, gB], 10.2);
        [-0.36, 0.36].forEach(rt => addMazeWall(rt * halfW, midZ, 2.6, subWallD * 0.9));
      }
    }

    const boxSide = ((r + mazeRunCount) % 2 === 0) ? -1 : 1;
    addJumpRock(boxSide * (halfW - 4.2), midZ, 2.8, 1.2, 2.8, true);
    addHayBaleCluster(-boxSide * (halfW - 3.6), midZ - 1.5);
  }

  addHayBaleCluster(-halfW + 4.5, halfD - 6.5);
  addHayBaleCluster(halfW - 4.5, halfD - 6.5);

  const startPos = { x: 0, z: halfD - 5.0 };
  const allSpawnedInside = [];
  const interiorBounds = { minX: -halfW + 5.5, maxX: halfW - 5.5, minZ: -halfD + 7.5, maxZ: halfD - 11.0 };

  const extraTypes = ['penguin', 'turtle', 'fox', 'pig', 'duck', 'bear', 'koala'];
  const shuffledFriends = [...extraTypes].sort(() => Math.random() - 0.5);
  for (let i = 0; i < rows * 2; i++) {
    const fType = shuffledFriends[i % shuffledFriends.length];
    const [fx, fz] = findRandomSafeSpot(interiorBounds, allSpawnedInside, 6.5, startPos, 7.0);
    allSpawnedInside.push([fx, fz]);

    const fAnimal = createSingleAnimal(fType);
    fAnimal.position.set(fx, 0, fz);
    fAnimal.rotation.y = Math.random() * Math.PI * 2;
    worldGroup.add(fAnimal);
    const flbl = createWorldLabel(`${ANIMAL_SPECS[fType].icon} ${ANIMAL_SPECS[fType].name} ${currentMode === 'timeattack' ? '(+5초!⏱️)' : ''}`);
    arkFriends.push({ group: fAnimal, label: flbl, met: false, baseX: fx, baseZ: fz, phase: i });
  }

  if (stageNum === 2) {
    const doveX = ((mazeRunCount % 3) - 1) * (halfW * 0.28);
    const goalZ = -halfD + 4.8, winZ = -halfD + 0.85;

    const arkWindow = createArkWallWindow();
    arkWindow.position.set(doveX, 3.8, winZ);
    worldGroup.add(arkWindow);
    addWallTorch(doveX - 3.2, 3.8, winZ + 0.6);
    addWallTorch(doveX + 3.2, 3.8, winZ + 0.6);

    const spotRing = new THREE.Mesh(new THREE.RingGeometry(1.3, 1.75, 24), new THREE.MeshBasicMaterial({ color: 0xfde047, side: THREE.DoubleSide }));
    spotRing.rotation.x = -Math.PI / 2; spotRing.position.set(doveX, 0.06, goalZ);
    worldGroup.add(spotRing);

    const dove = createDoveMesh(false);
    dove.scale.set(1.25, 1.25, 1.25);
    dove.position.set(doveX, 2.5, goalZ);
    worldGroup.add(dove);

    const dlbl = createWorldLabel('🕊️ 날고 있는 하얀 비둘기 (다가가서 창문 열기)');
    targetObject = {
      type: 'dove', mesh: dove, windowObj: arkWindow.userData, spotRing: spotRing,
      baseX: doveX, baseZ: goalZ, halfD: halfD, pos: new THREE.Vector3(doveX, 2.5, goalZ), label: dlbl, triggered: false
    };
  } else {
    rescuedPairs = 0;
    const pairTypes = ['lion', 'sheep', 'elephant', 'giraffe', 'panda', 'rabbit', 'deer'];
    const pairSpots = [];
    const sectors = isHard ? buildSpreadSectors(interiorBounds) : null;

    pairTypes.forEach((type, i) => {
      const minSpacing = isHard ? 18.0 : 10.5;
      const [px, pz] = pickWidelySpreadAnimalSpot(
        interiorBounds,
        pairSpots,
        minSpacing,
        startPos,
        isHard ? 11.0 : 8.0,
        sectors ? sectors[i % sectors.length] : null
      );
      pairSpots.push([px, pz]);
      const pairGroup = createAnimalPairGroup(type, 0x38bdf8);
      pairGroup.position.set(px, 0, pz);
      pairGroup.rotation.y = Math.random() * Math.PI * 2;
      worldGroup.add(pairGroup);

      const bonusTxt = currentMode === 'timeattack' ? ' (+5초!⏱️)' : '';
      const lbl = createWorldLabel(`${ANIMAL_SPECS[type].icon} ${ANIMAL_SPECS[type].name} 한 쌍${bonusTxt}`);
      stageAnimals.push({
        type, group: pairGroup, rescued: false, label: lbl,
        heading: 0, targetHeading: 0, avoidTimer: 0, stuckTimer: 0, fleeState: false, limit: halfW - 4
      });
    });

    const wallDoorZ = -halfD + 0.85;
    const doorFrame = new THREE.Group();
    doorFrame.add(
      createBox(1.5, 5.6, 1.4, matVoxel('#fbbf24'), -3.2, 2.8, 0),
      createBox(1.5, 5.6, 1.4, matVoxel('#fbbf24'), 3.2, 2.8, 0),
      createBox(8.0, 1.2, 1.5, matVoxel('#f59e0b'), 0, 5.8, 0),
      createBox(5.0, 5.2, 0.5, new THREE.MeshBasicMaterial({ color: 0xffffff }), 0, 2.6, 0.25, false)
    );
    doorFrame.position.set(0, 0, wallDoorZ);
    worldGroup.add(doorFrame);
    addWallTorch(-4.6, 3.5, wallDoorZ + 0.9);
    addWallTorch(4.6, 3.5, wallDoorZ + 0.9);

    const elbl = createWorldLabel('🚪 방주 출구 문 (동물 7쌍과 함께 나가기!)');
    targetObject = { type: 'door', mesh: doorFrame, pos: new THREE.Vector3(0, 1.5, wallDoorZ + 1.2), label: elbl, triggered: false };

    for (let step = 0; step < 30; step++) {
      noahStage3Trail.push({ x: startPos.x, z: Math.min(halfD - 2.2, startPos.z + step * 0.25) });
    }
  }

  playerPos.set(0, 0, halfD - 5.0);
  playerVelY = 0; isGrounded = true; playerFacing = 0;
  cameraYaw = 0; cameraTargetYaw = 0;
  snapCameraToPlayer();
  updateStageHUD();
}

// -------------------------------------------------------------------------
// [컷신 업데이트] 스테이지 2 비둘기 창문 날리기 & 감람나무 잎사귀 귀환 연출
// -------------------------------------------------------------------------
function updateNoahCutsceneFrame(dt, now) {
  if (!doveCutscene.active || !targetObject || targetObject.type !== 'dove') return false;

  doveCutscene.timer += dt;
  const t = doveCutscene.timer, dove = targetObject.mesh, win = targetObject.windowObj;

  if (dove.userData.lWing) {
    const flap = Math.sin(now * 0.028) * 0.6;
    dove.userData.lWing.rotation.z = flap;
    dove.userData.rWing.rotation.z = -flap;
  }

  camera.position.lerp(new THREE.Vector3(doveCutscene.doveX, 4.3, doveCutscene.goalZ + 6.8), 0.14);
  camera.lookAt(doveCutscene.doveX, 3.2, doveCutscene.winZ);
  updateWallTransparency();

  if (t < 1.65) {
    const openRatio = Math.min(1, t / 0.55);
    if (win) {
      win.lShutter.rotation.y = -openRatio * Math.PI * 0.72;
      win.rShutter.rotation.y = openRatio * Math.PI * 0.72;
    }
    if (t > 0.3) {
      const flyOutP = Math.min(1, (t - 0.3) / 1.2);
      dove.rotation.y = lerpAngle(dove.rotation.y, Math.PI, dt * 14);
      dove.position.x = THREE.MathUtils.lerp(dove.position.x, doveCutscene.doveX, 0.25);
      dove.position.y = THREE.MathUtils.lerp(2.5, 3.85, flyOutP);
      dove.position.z = THREE.MathUtils.lerp(doveCutscene.goalZ, doveCutscene.winZ - 3.2, flyOutP);
    }
    if (t >= 1.35 && doveCutscene.phase === 1) {
      doveCutscene.phase = 2;
      document.getElementById('white-fade').style.opacity = '1';
    }
  } else if (t < 2.4) {
    if (t >= 2.1 && doveCutscene.phase === 2) {
      doveCutscene.phase = 3;
      if (dove.userData.leaf) dove.userData.leaf.visible = true;
      dove.rotation.y = 0;
      dove.position.set(doveCutscene.doveX, 3.85, doveCutscene.winZ - 2.6);
      document.getElementById('white-fade').style.opacity = '0';
      playSfx('rescue');
      showToast('🌿 비둘기가 감람나무 새 잎사귀를 물고 창문으로 돌아왔어요!');
    }
  } else if (t < 4.15) {
    const flyInP = Math.min(1, (t - 2.4) / 1.35), easeOut = 1 - Math.pow(1 - flyInP, 3);
    dove.position.x = doveCutscene.doveX;
    dove.position.y = THREE.MathUtils.lerp(3.85, 2.35, easeOut) + Math.sin(now * 0.012) * 0.1;
    dove.position.z = THREE.MathUtils.lerp(doveCutscene.winZ - 2.6, doveCutscene.goalZ, easeOut);
    if (flyInP > 0.8) dove.rotation.y = lerpAngle(dove.rotation.y, -0.45, dt * 6);
  } else {
    doveCutscene.active = false;
    openStageClearModal(2);
  }
  return true;
}

// -------------------------------------------------------------------------
// [프레임 업데이트] 스테이지 1~3 동물 구출, 비둘기 탐색, 대열 추종 및 출구 이동
// -------------------------------------------------------------------------
function updateNoahStageFrame(dt, now) {
  if (currentStage === 1) {
    let nearest = null, minDist = 999;
    stageAnimals.forEach((a, idx) => {
      if (a.rescued) {
        a.group.position.y = 6.6 + Math.abs(Math.sin(now * 0.006 + idx)) * 0.15;
        return;
      }
      const curX = a.group.position.x, curZ = a.group.position.z;
      const dxFromNoah = curX - playerPos.x, dzFromNoah = curZ - playerPos.z;
      const d = Math.hypot(dxFromNoah, dzFromNoah);

      if (currentMode === 'senior' || currentMode === 'timeattack') {
        if (a.avoidTimer > 0) a.avoidTimer -= dt;
        if (a.wanderTimer !== undefined) a.wanderTimer -= dt;
        if (a.dashTimer > 0) a.dashTimer -= dt;
        if (a.dashCooldown > 0) a.dashCooldown -= dt;

        const isFleeing = (d < 11.2);
        const awayFromNoahAngle = Math.atan2(dxFromNoah, dzFromNoah);

        // [요청사항] 노아가 동물에게 가까이 다가오면 순간가속(dash)으로 약간 멀어지게 처리
        if (d < 7.5 && a.dashCooldown <= 0) {
          a.dashTimer = 0.38;
          a.dashCooldown = 2.6;
          a.avoidTimer = 0;
        }

        let sepX = 0, sepZ = 0;
        stageAnimals.forEach(other => {
          if (other === a || other.rescued) return;
          const odx = curX - other.group.position.x;
          const odz = curZ - other.group.position.z;
          const od = Math.hypot(odx, odz);
          if (od < 4.8 && od > 0.001) {
            const push = (4.8 - od) / 4.8;
            sepX += (odx / od) * push * 2.4;
            sepZ += (odz / od) * push * 2.4;
          } else if (od <= 0.001) {
            const randAng = idx * 1.7;
            sepX += Math.sin(randAng) * 2.0;
            sepZ += Math.cos(randAng) * 2.0;
          }
        });

        const edgeMargin = a.limit - 4.5;
        if (curX > edgeMargin) sepX -= (curX - edgeMargin) * 0.45;
        if (curX < -edgeMargin) sepX += (-edgeMargin - curX) * 0.45;
        if (curZ > edgeMargin) sepZ -= (curZ - edgeMargin) * 0.45;
        if (curZ < -6.5) sepZ += (-6.5 - curZ) * 0.55;

        if (isFleeing) {
          if (!a.fleeState) {
            a.fleeState = true;
            a.label.innerHTML = `${ANIMAL_SPECS[a.type].icon} ${ANIMAL_SPECS[a.type].name} 💨도망중!`;
          }
          if (a.avoidTimer <= 0) {
            const bias = a.fleeBias || 0;
            const fleeDirX = Math.sin(awayFromNoahAngle + bias) * 2.8 + sepX;
            const fleeDirZ = Math.cos(awayFromNoahAngle + bias) * 2.8 + sepZ;
            a.targetHeading = Math.atan2(fleeDirX, fleeDirZ);
          }
        } else {
          if (a.fleeState) {
            a.fleeState = false;
            a.label.innerHTML = `${ANIMAL_SPECS[a.type].icon} ${ANIMAL_SPECS[a.type].name} 한 쌍`;
            a.targetHeading = awayFromNoahAngle + (a.fleeBias || 0);
          }
          if ((a.wanderTimer !== undefined && a.wanderTimer <= 0) || Math.hypot(sepX, sepZ) > 0.6) {
            a.wanderTimer = 1.6 + (idx % 3) * 0.55;
            let nextWander = a.heading + ((idx % 2 === 0 ? 1 : -1) * (0.35 + Math.random() * 0.55));
            if (Math.hypot(sepX, sepZ) > 0.4) {
              nextWander = lerpAngle(nextWander, Math.atan2(sepX, sepZ), 0.65);
            }
            const diffToNoah = Math.atan2(Math.sin(nextWander - awayFromNoahAngle), Math.cos(nextWander - awayFromNoahAngle));
            if (d < 16.0 && Math.abs(diffToNoah) > 1.65) {
              nextWander = awayFromNoahAngle + (diffToNoah >= 0 ? 1.15 : -1.15);
            }
            a.targetHeading = nextWander;
          }
        }

        const isDashing = (a.dashTimer > 0);
        const spdMult = a.speedScale || 1.0;
        const baseFleeSpd = isDashing ? 10.2 : 5.3;
        const moveSpd = (isFleeing ? baseFleeSpd : 3.2) * spdMult;
        const stepDist = moveSpd * dt;

        const probeDist = Math.max(0.95, stepDist * 3.2);
        const probeX = curX + Math.sin(a.targetHeading) * probeDist;
        const probeZ = curZ + Math.cos(a.targetHeading) * probeDist;

        if (!isStage1AnimalSpotClear(probeX, probeZ, a.limit, 1.2)) {
          const safeSteer = findBestAnimalSteerAngle(a, a.targetHeading, awayFromNoahAngle, isFleeing, probeDist);
          if (safeSteer !== null) {
            a.targetHeading = safeSteer;
            a.heading = lerpAngle(a.heading, safeSteer, 0.72);
            a.avoidTimer = 0.25;
          }
        } else {
          a.heading = lerpAngle(a.heading, a.targetHeading, dt * (isDashing ? 14.0 : (isFleeing ? 9.5 : 6.5)));
        }

        const nx = curX + Math.sin(a.heading) * stepDist;
        const nz = curZ + Math.cos(a.heading) * stepDist;

        let moved = false;
        if (isStage1AnimalSpotClear(nx, nz, a.limit, 1.15)) {
          a.group.position.x = nx;
          a.group.position.z = nz;
          moved = true;
        } else {
          const emergencySteer = findBestAnimalSteerAngle(a, awayFromNoahAngle, awayFromNoahAngle, isFleeing, Math.max(0.8, stepDist * 2.2));
          if (emergencySteer !== null) {
            a.heading = emergencySteer;
            a.targetHeading = emergencySteer;
            const ex = curX + Math.sin(emergencySteer) * stepDist;
            const ez = curZ + Math.cos(emergencySteer) * stepDist;
            if (isStage1AnimalSpotClear(ex, ez, a.limit, 1.05)) {
              a.group.position.x = ex;
              a.group.position.z = ez;
              moved = true;
            }
          }
          if (!moved) {
            if (isStage1AnimalSpotClear(nx, curZ, a.limit, 1.05)) {
              a.group.position.x = nx;
              moved = true;
            } else if (isStage1AnimalSpotClear(curX, nz, a.limit, 1.05)) {
              a.group.position.z = nz;
              moved = true;
            }
          }
        }

        if (!moved) {
          a.stuckTimer = (a.stuckTimer || 0) + dt;
          if (a.stuckTimer > 0.15) {
            for (let distStep = 0.6; distStep <= 2.4; distStep += 0.6) {
              const escAngle = findBestAnimalSteerAngle(a, awayFromNoahAngle, awayFromNoahAngle, true, distStep);
              if (escAngle !== null) {
                a.group.position.x = curX + Math.sin(escAngle) * 0.45;
                a.group.position.z = curZ + Math.cos(escAngle) * 0.45;
                a.heading = escAngle;
                a.targetHeading = escAngle;
                a.stuckTimer = 0;
                break;
              }
            }
          }
        } else {
          a.stuckTimer = 0;
        }

        a.group.rotation.y = a.heading;
        a.group.position.y = Math.abs(Math.sin(now * (isDashing ? 0.014 : (isFleeing ? 0.0085 : 0.006)) + idx)) * (isDashing ? 0.22 : 0.15);
      }

      const afterDist = Math.hypot(a.group.position.x - playerPos.x, a.group.position.z - playerPos.z);
      if (afterDist < minDist) { minDist = afterDist; nearest = a.group.position; }
      updateWorldLabelPos(a.label, a.group.position, afterDist < 30);

      if (afterDist < 2.35) {
        a.rescued = true;
        if (a.group.userData && a.group.userData.ring) a.group.userData.ring.visible = false;
        a.group.position.set(-7.2 + rescuedPairs * 2.4, 6.6, -16.2);
        a.group.rotation.y = 0;
        a.label.style.opacity = '0';
        rescuedPairs++;
        playSfx('rescue');
        if (currentMode === 'timeattack') {
          timeRemaining += 5.0;
          showToast(`🐾 ${ANIMAL_SPECS[a.type].name} 방주 위 탑승! (+5초 연장!)`);
        } else {
          showToast(`🐾 ${ANIMAL_SPECS[a.type].name} 한 쌍이 방주 위로 올라갔어요! (${rescuedPairs}/7)`);
        }
        document.getElementById('hud-counter-text').textContent = `${rescuedPairs}/7쌍`;
        if (rescuedPairs >= 7) openStageClearModal(1);
      }
    });
    if (nearest && guideArrowGroup.visible) {
      guideArrowGroup.rotation.y = Math.atan2(nearest.x - playerPos.x, nearest.z - playerPos.z) - playerFacing;
    }
  }

  if (currentStage === 2 || currentStage === 3) {
    if (window.noahArkCeilingGroup) {
      window.noahArkCeilingGroup.visible = (window.globalCameraViewMode === 'fps');
    }
    if (noahOuterSeaWaves.length > 0) {
      noahOuterSeaWaves.forEach(w => {
        w.mesh.position.y = w.baseY + Math.sin(now * 0.0042 + w.phase) * 0.35;
        if (w.isEW) {
          w.mesh.position.z = w.baseZ + Math.cos(now * 0.0028 + w.phase) * 1.1;
        } else {
          w.mesh.position.x = w.baseX + Math.cos(now * 0.0028 + w.phase) * 1.1;
        }
      });
    }
    arkFriends.forEach(f => {
      const swayX = f.baseX + Math.sin(now * 0.002 + f.phase) * 1.4;
      if (canMoveTo(swayX, f.baseZ, 0)) f.group.position.x = swayX;
      const d = Math.hypot(playerPos.x - f.group.position.x, playerPos.z - f.group.position.z);
      updateWorldLabelPos(f.label, f.group.position, d < 18 && !f.met);
      if (!f.met && d < 2.2) {
        f.met = true; f.label.style.opacity = '0'; playSfx('rescue');
        if (currentMode === 'timeattack') {
          timeRemaining += 5.0;
          showToast('⏱️ 동물 친구를 만나 +5초 시간이 늘어났어요!');
        } else {
          showToast('🎉 방주 안 동물 친구가 반갑게 노아를 응원해 주었어요!');
        }
      }
    });
  }

  if (currentStage === 2 && targetObject && !targetObject.triggered) {
    const dove = targetObject.mesh, hoverAngle = now * 0.0032;
    dove.position.x = targetObject.baseX + Math.sin(hoverAngle) * 0.95;
    dove.position.z = targetObject.baseZ + Math.cos(hoverAngle) * 0.55;
    dove.position.y = 2.45 + Math.sin(now * 0.007) * 0.32;
    dove.rotation.y = Math.atan2(Math.cos(hoverAngle) * 0.95, -Math.sin(hoverAngle) * 0.55);

    if (dove.userData.lWing) {
      const flap = Math.sin(now * 0.022) * 0.52;
      dove.userData.lWing.rotation.z = flap;
      dove.userData.rWing.rotation.z = -flap;
    }
    targetObject.pos.copy(dove.position);

    const td = Math.hypot(playerPos.x - targetObject.baseX, playerPos.z - targetObject.baseZ);
    updateWorldLabelPos(targetObject.label, targetObject.pos, (currentMode === 'senior') ? (td < 8.5) : (td < 24.0));

    if (guideArrowGroup.visible) {
      guideArrowGroup.rotation.y = Math.atan2(targetObject.baseX - playerPos.x, targetObject.baseZ - playerPos.z) - playerFacing;
    }

    const ctxBtn = document.getElementById('context-action-btn');
    if (td < 3.8) {
      ctxBtn.classList.remove('hidden');
      ctxBtn.textContent = '🕊️ 창문 열고 비둘기 날리기!';
      if (td < 2.2) triggerContextAction();
    } else {
      ctxBtn.classList.add('hidden');
    }
  }

  if (currentStage === 3) {
    recordNoahStage3Trail();

    let nearestTarget = null, minDist = 999;
    stageAnimals.forEach(a => {
      if (a.rescued) return;
      const d = Math.hypot(playerPos.x - a.group.position.x, playerPos.z - a.group.position.z);
      if (d < minDist) { minDist = d; nearestTarget = a.group.position; }
      updateWorldLabelPos(a.label, a.group.position, d < 22);

      if (d < 2.4) {
        a.rescued = true;
        if (a.group.userData && a.group.userData.ring) a.group.userData.ring.visible = false;
        a.label.style.opacity = '0';
        followingAnimals.push(a);
        rescuedPairs++;
        playSfx('rescue');
        if (currentMode === 'timeattack') {
          timeRemaining += 5.0;
          showToast(`🐾 ${ANIMAL_SPECS[a.type].name} 합류! (+5초! ${rescuedPairs}/7)`);
        } else {
          showToast(`🐾 ${ANIMAL_SPECS[a.type].name} 한 쌍이 노아 뒤를 졸졸 따라와요! (${rescuedPairs}/7)`);
        }
        document.getElementById('hud-counter-text').textContent = `${rescuedPairs}/7쌍`;
        if (rescuedPairs === 7) showToast('🎉 동물 7쌍이 모두 뒤따라와요! 북쪽 벽의 출구 문으로 나가세요!');
      }
    });

    followingAnimals.forEach((fa, idx) => {
      const targetArcDist = 2.1 + idx * 1.85;
      const trailPt = getNoahTrailTargetPos(targetArcDist);
      moveStage3FollowerSafely(fa, idx, trailPt.x, trailPt.z, dt, now);
    });

    if (targetObject && !targetObject.triggered) {
      const td = Math.hypot(playerPos.x - targetObject.pos.x, playerPos.z - targetObject.pos.z);
      targetObject.label.innerHTML = rescuedPairs >= 7 ? '🚪 방주 출구 문 열림! (새 세상으로 나가기!)' : `🔒 방주 출구 문 (동물 ${rescuedPairs}/7쌍 합류)`;
      updateWorldLabelPos(targetObject.label, targetObject.pos, (rescuedPairs >= 7) ? (td < 28.0) : (td < 10.0));

      const guidePos = (rescuedPairs >= 7) ? targetObject.pos : (nearestTarget || targetObject.pos);
      if (guidePos && guideArrowGroup.visible) {
        guideArrowGroup.rotation.y = Math.atan2(guidePos.x - playerPos.x, guidePos.z - playerPos.z) - playerFacing;
      }

      const ctxBtn = document.getElementById('context-action-btn');
      if (td < 4.5) {
        ctxBtn.classList.remove('hidden');
        ctxBtn.textContent = rescuedPairs >= 7 ? '🚪 출구 문 열고 새 세상으로 나가기!' : `🐾 먼저 7개를 모두 모아주세요 (${rescuedPairs}/7)`;
        if (td < 2.8 && rescuedPairs >= 7) triggerContextAction();
      } else {
        ctxBtn.classList.add('hidden');
      }
    }
  }
}
