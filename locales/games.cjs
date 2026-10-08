// Template-driven games that share the {{key}} page pipeline, in homepage and navigation order.
module.exports = [
 {kind:'lander',source:'src/lander.html',copy:require('./lander.cjs'),styles:['lander.css'],
  card:l=>({tags:[l.conceptGravity,l.conceptAcceleration],board:[[l.netAcceleration,'a = aₜ − g'],[l.contactLabel,'|v| ≤ 1.5 m/s']]})},
 {kind:'pipeline',source:'src/pipeline.html',copy:require('./pipeline.cjs'),styles:['module.css','pipeline.css'],
  card:l=>({tags:[l.tag1,l.tag2],board:[[l.board1,'t = V ÷ Q'],[l.board2,'1 m³ = 1000 L']]})},
 {kind:'scale',source:'src/scale.html',copy:require('./scale.cjs'),styles:['module.css','scale.css'],
  card:l=>({tags:[l.tag1,l.tag2],board:[[l.board1,'t = d ÷ v'],[l.board2,'1 μm = 10⁻⁶ m']]})},
 {kind:'river',source:'src/river.html',copy:require('./river.cjs'),styles:['module.css','river.css'],
  card:l=>({tags:[l.tag1,l.tag2],board:[[l.board1,'v = v_b + v_w'],[l.board2,'s · sin θ = u']]})},
 {kind:'walk',source:'src/walk.html',copy:require('./walk.cjs'),styles:['module.css','walk.css'],
  card:l=>({tags:[l.tag1,l.tag2],board:[[l.board1,'Δr = r₁ + r₂ + …'],[l.board2,'s = Σ|rᵢ| ≥ |Δr|']]})},
 {kind:'forces',source:'src/forces.html',copy:require('./forces.cjs'),styles:['module.css','forces.css'],
  card:l=>({tags:[l.tag1,l.tag2],board:[[l.board1,'ΣF = 0'],[l.board2,'|F₁ + F₂| ≤ |F₁| + |F₂|']]})}
];
