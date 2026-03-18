-- Align achievement reward copy with climbing milestone ladder (dashboard / progress)

UPDATE achievements
SET
  reward = '1 guest pass code (share with a friend)',
  reward_vi = '1 mã vé khách (cho bạn bè)'
WHERE code = 'VISIT_10';

UPDATE achievements
SET
  reward = '5 guest pass codes',
  reward_vi = '5 mã vé khách'
WHERE code = 'VISIT_25';

UPDATE achievements
SET
  reward = 'Leo May cap — pick up at front desk',
  reward_vi = 'Mũ Leo Mây — nhận tại quầy lễ tân'
WHERE code = 'VISIT_50';

UPDATE achievements
SET
  reward = 'Leo May t-shirt — pick up at front desk',
  reward_vi = 'Áo Leo Mây — nhận tại quầy lễ tân'
WHERE code = 'VISIT_100';
