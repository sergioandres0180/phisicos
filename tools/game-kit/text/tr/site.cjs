// Turkish site shell: static page content, topic and collection copy. Installed by tools/game-kit/add-lang.cjs.
module.exports = {
pages: {
 name:'Türkçe',home:'/tr/',game:'/tr/oyunlar/hareket/surat-ve-hiz/',locale:'tr_TR',
 homeTitle:'Fizik için eğitici simülasyon oyunları | Phisicos',
 gameTitle:'Sürat ve hız: eğitici simülasyon oyunu | Phisicos',
 homeDescription:'Tarayıcında ücretsiz eğitici simülasyon oyunları oyna. Sürat, hız, kütle çekimi ve ivme hakkındaki tahminlerini canlı ölçümlerle sına.',
 gameDescription:'Fizik laboratuvarı ve Pac-Man kovalamacası içeren, sürat ve hız hakkında eğitici bir simülasyon oyunu. Alınan yolu, yer değiştirmeyi ve ivmeyi etkileşimli olarak keşfet.',
 homeLabel:'Ana sayfa',gameLabel:'Sürat ve hız',language:'Dil',skip:'İçeriğe geç',games:'Eğitici simülasyon oyunları',
 hero:'Fizik öğrenmek için<br>eğitici simülasyon oyunları.',heroLabel:'Hareketi keşfet · Fizikle oyna',
 lead:'Tahmin et. Hareketi değiştir. Ölçümlerin ne gösterdiğine bak.',
 available:'HEMEN OYNA',cardTitle:'Sürat ve hız',
 cardCopy:'Hareket eden bir hedefi yakala ya da bir parçacığı pistte gönder. Daha uzun bir yolun neden her zaman başlangıçtan daha uzağa gitmek anlamına gelmediğini keşfet.',
 play:'Sürat ve hız simülasyonunu oyna',lab:'Fizik laboratuvarı',chase:'Pac-Man kovalamacası',
 topic:'KİNEMATİK · ÖLÇME · FORMÜLLER · VEKTÖRLER · TRİGONOMETRİ · ATIŞ HAREKETİ · DAİRESEL HAREKET · KÜTLE ÇEKİMİ · STATİK',
 gamesMenu:'Oyunlar',
 later:'Yeni eğitici simülasyon oyunları hazırlanıyor.',laterCopy:'Bu koleksiyon hareketle başlıyor. Yeni oyunlar hazır oldukça burada yer alacak.',
 homeLearn:'Soruları deneylere dönüştüren eğitici simülasyon oyunları',
 homeBody:'Phisicos ile her seferinde tek bir fikri keşfedersin. Her eğitici simülasyon oyunu, kontrol edilebilir bir fizik modelini bir görevle birleştirir: alınan yolu, zamanı ve yönü ilişkilendirmek için bir hayaleti kovala ya da kütle çekimini ve motor itişini dengeleyerek bir modülü indir.',
 homeSteps:['Hareketin nasıl gelişeceğini tahmin et.','Başlat, duraklat ya da zamanı 0,10 saniye ilerlet.','Ölçümleri karşılaştır ve sonucu açıkla.'],
 gameHeading:'Sürat ve hız: eğitici simülasyon oyunu',
 guideTitle:'Sürat ve hız oyunu nasıl oynanır',
 steps:['Düz ya da dairesel bir pisti keşfetmek için fizik laboratuvarını ya da Pac-Man kovalamacasını seç.','Sürati ve yönü ayarla. Laboratuvarda teğetsel ivmeyi de değiştirebilirsin.','Ne olacağını tahmin et ve hareketi başlat. Ölçümleri okumak için duraklat ya da adım adım ilerlet.','Bir gidiş-dönüş ya da tam bir tur tamamla. Başlangıca döndüğünde ortalama sürati ortalama hızla karşılaştır.'],
 lessonTitle:'Bu eğitici simülasyon oyunu hız hakkında ne öğretir',
 lesson:'Sürat, bir şeyin ne kadar hızlı hareket ettiğini söyler. Hız ayrıca yönü de içerir. Ortalama sürat, toplam alınan yolun zamana bölümüdür; ortalama hız ise yer değiştirmenin zamana bölümüdür. Bir dönüş, sürat sabit kalsa bile hızı değiştirebilir.',
 exampleTitle:'Dene: hayaleti 6 saniyede yakala',
 example:'Hayalet, Pac-Man\'in 12 m önünde başlar. Pac-Man 4 m/s, hayalet aynı yönde 2 m/s ile giderken aradaki mesafe saniyede 2 m kapanır. Tahmin edilen yakalama süresi 12 ÷ (4 − 2) = 6 s. Süratlerden birini değiştir ve yeni bir tahmini sına.',
 faqTitle:'Sürat ve hız hakkında sorular',
 faq:[['Ortalama sürat pozitifken ortalama hız sıfır olabilir mi?','Evet. 48 m\'lik kovalamaca pistini dolaş ve 12 s sonra başlangıca dön. Ortalama süratin 48 ÷ 12 = 4 m/s olur, yer değiştirmen ve ortalama hızın ise sıfırdır.'],['Yön değiştirdiğimde ne olur?','Hız vektörü yön değiştirir. Toplam alınan yol artmaya devam eder; yer değiştirme ise yalnızca başlangıç ve şu anki konuma bağlıdır.'],['Bir şey yüklemem gerekiyor mu?','Hayır. İki etkinlik de HTML5 Canvas ile modern bir tarayıcıda çalışır. Ekrandaki düğmeleri fare, dokunma ya da klavye ile kullan.']],
 back:'Tüm eğitici simülasyon oyunlarını gör',footer:'Keşfet → tahmin et → ölç → açıkla',notFound:'Sayfa bulunamadı',missing:'Bu sayfa kullanılamıyor. Ana sayfadan bir oyun seç.'
},
section:'/tr/oyunlar/',
index: {
 label:'Konular',
 title:'Fizik ve matematik konuları: eğitici simülasyon oyunları | Phisicos',
 description:'Eğitici simülasyon oyunlarına konulara göre göz at: hareket, ölçme, formüller, vektörler, trigonometri, atış hareketi, dairesel hareket, kütle çekimi, statik, tork ve dönme, kütle merkezi, akışkanlar, akış, salınımlar ve dalgalar. Her konu, aynı fikri adım adım kuran oyunları bir araya getirir.',
 heading:'Eğitici simülasyon oyunlarına konulara göre göz at',
 intro:'Önerilen sırayla oyunlarını görmek için bir konu seç. Her oyun, çalışan bir simülasyonu sınayabileceğin bir tahminle birleştirir.'
},
ui: {browse:'Konulara göre göz at',all:'Tüm konular',count:'{n} oyun',other:'Diğer konular',eyebrow:'Konu',gamesHeading:'Bu konudaki oyunlar'},
topics: {
 motion: {
  slug:'hareket',name:'Hareket',summary:'Konum, hız, ivme ve kütle çekimi.',
  title:'Hareket: sürat, hız ve ivme üzerine eğitici simülasyon oyunları | Phisicos',
  description:'Hareket üzerine eğitici simülasyon oyunları. Sürati hızla karşılaştır, ivmeyi bir grafikten oku, çizgiden önce fren yap ve kütle çekimini itişle dengeleyerek bir modülü indir.',
  heading:'Hareket: sürat, hız ve ivme',
  intro:'Konum, hız ve ivmenin zamanla nasıl değiştiğini görmek için buradan başla. Bir yakalama süresini ya da güvenli bir inişi tahmin et, sonra gerçekte ne olduğunu ölç.'
 },
 measurement: {
  slug:'olcme',name:'Ölçme',summary:'Birimler, SI ön ekleri ve bilimsel gösterim.',
  title:'Ölçme: birimler ve on\'un kuvvetleri üzerine eğitici simülasyon oyunları | Phisicos',
  description:'Ölçme üzerine eğitici simülasyon oyunları. Birimleri tam çarpanlarla dönüştür; mikrometreden megametreye SI ön eklerini ve bilimsel gösterimi kullan.',
  heading:'Ölçme: birimler, ön ekler ve bilimsel gösterim',
  intro:'Fizikteki her sonucun bir birime ihtiyacı vardır. Bu oyunlar, gözlemleyebileceğin büyüklükler üzerinde birim dönüştürmeyi, SI ön eklerini ve bilimsel gösterimi çalıştırır.'
 },
 formulas: {
  slug:'formuller',name:'Formüller',summary:'Formülleri düzenlemek: ters işlemler ve birim kontrolü.',
  title:'Formüller: denklemleri düzenleme üzerine eğitici simülasyon oyunları | Phisicos',
  description:'Formülleri düzenleme üzerine eğitici simülasyon oyunları. Bir denklemi dengede tut, işlemleri ters sırayla geri al ve düzenlenmiş bir formülü hareket eden bir arabada sına.',
  heading:'Formüller: önce düzenle, sonra hesapla',
  intro:'Bir fizik formülü, içindeki her harf için çözülebilir. Bilinmeyeni her iki tarafa aynı işlemi uygulayarak yalnız bırak, işlemleri ters sırayla geri al ve sonucun birimlerini kontrol et.'
 },
 vectors: {
  slug:'vektorler',name:'Vektörler',summary:'Vektör toplama, yer değiştirme ve kuvvetler.',
  title:'Vektörler: vektör toplama üzerine eğitici simülasyon oyunları | Phisicos',
  description:'Vektörler üzerine eğitici simülasyon oyunları. Bir nehri geçerken hızları topla, alınan yolu yer değiştirmeyle karşılaştır ve kuvvetleri uç uca ekleyerek dengele.',
  heading:'Vektörler: yön önemlidir',
  intro:'Bir vektörün büyüklüğü ve yönü vardır. Bu oyunlar, büyüklüklerin ne zaman sayılar gibi toplandığını ve ne zaman uç uca eklendiğini gösterir.'
 },
 trigonometry: {
  slug:'trigonometri',name:'Trigonometri',summary:'Dik üçgenler, ters fonksiyonlar ve birim çember.',
  title:'Trigonometri: sinüs, kosinüs ve tanjant üzerine eğitici simülasyon oyunları | Phisicos',
  description:'Temel trigonometri üzerine eğitici simülasyon oyunları. Dik üçgenleri çöz, açıları ters fonksiyonlarla bul ve sinüs ile kosinüsü birim çember üzerinde oku.',
  heading:'Trigonometri: açılar ve kenarlar',
  intro:'Trigonometri açıları uzunluklara bağlar. Dik üçgenlerle başla, yükselme ve alçalma açılarına geç, sonra sinüs ve kosinüsü tüm çemberin etrafında izle.'
 },
 projectile: {
  slug:'atis-hareketi',name:'Atış hareketi',summary:'Yatay ve eğik atış: aynı anda iki hareket.',
  title:'Atış hareketi: fırlatılan cisimler üzerine eğitici simülasyon oyunları | Phisicos',
  description:'Atış hareketi üzerine eğitici simülasyon oyunları. Bir uçaktan sandık bırak, bir atışı iki gölgeye ayır ve bir topla hedefe nişan al.',
  heading:'Atış hareketi: aynı anda iki hareket',
  intro:'Fırlatılan bir cisim yatayda sabit hızla ilerlerken aynı anda sabit ivmeyle düşer. İki hareketi ayrı ayrı ele alarak düşme sürelerini, yükseklikleri ve menzilleri tahmin et.'
 },
 circular: {
  slug:'dairesel-hareket',name:'Dairesel hareket',summary:'Düzgün dairesel hareket, açısal hız ve merkezcil kuvvet.',
  title:'Dairesel hareket: virajlar ve dönüşler üzerine eğitici simülasyon oyunları | Phisicos',
  description:'Dairesel hareket üzerine eğitici simülasyon oyunları. Bir atlıkarıncanın dönüşünü zamanla, yapay kütle çekimi için bir uzay istasyonunu döndür ve bir arabanın virajı ne kadar hızlı alabileceğini bul.',
  heading:'Dairesel hareket: sürekli dönüş',
  intro:'Bir çember üzerinde sabit süratle hareket eden cisim, yönü durmadan değiştiği için sürekli ivmelenir. Açısal hızı ölç, merkezcil ivmeyi tahmin et ve cismi yayın üzerinde tutan kuvveti bul.'
 },
 gravitation: {
  slug:'kutle-cekimi',name:'Kütle çekimi',summary:'Newton\'un evrensel çekim yasası, ağırlık, yörüngeler ve Kepler yasaları.',
  title:'Kütle çekimi: evrensel çekim üzerine eğitici simülasyon oyunları | Phisicos',
  description:'Kütle çekimi üzerine eğitici simülasyon oyunları. Bir astronotu başka dünyalarda tart, bir uyduyu yörüngeye gönder ve Kepler\'in üçüncü yasasıyla ayların ve gezegenlerin periyotlarını ölç.',
  heading:'Kütle çekimi: kütleler arasındaki çekim',
  intro:'Her kütle diğer her kütleyi F = G·M·m ÷ r² kuvvetiyle çeker. Bu tek yasa Ay\'daki ağırlığını belirler, uyduları yörüngede tutar ve her gezegenin Güneş\'in etrafını ne kadar sürede dolaşacağını belirler.'
 },
 statics: {
  slug:'statik',name:'Statik',summary:'Kuvvet dengesi, ip gerilmeleri, tork ve destek tepkileri.',
  title:'Statik: kuvvet dengesi üzerine eğitici simülasyon oyunları | Phisicos',
  description:'Statik üzerine eğitici simülasyon oyunları. Bir tabelayı asmaya yetecek sağlamlıkta ipler seç, bir tahterevalliyi torklarla dengele ve yüklü bir yaya köprüsünün destek tepkilerini bul.',
  heading:'Statik: kuvvetler birbirini dengelediğinde',
  intro:'Bir cisim, ona etki eden kuvvetler birbirini dengelediğinde, ΣF = 0, ve döndürme etkileri de birbirini dengelediğinde, ΣM = 0, durgun kalır. Bu iki koşul her ipin dayanımını, tahterevallideki her çocuğun yerini ve köprünün her desteğindeki yükü belirler.'
 },
 rotation: {
  slug:'tork-ve-donme',name:'Tork ve dönme',summary:'Tork, kuvvet kolu, devrilme ve açısal ivme.',
  title:'Tork ve dönme: tork üzerine eğitici simülasyon oyunları | Phisicos',
  description:'Tork ve dönme üzerine eğitici simülasyon oyunları. Paslı bir cıvatayı anahtarla gevşet, yüklü bir forkliftin devrilmesini önle ve τ = I·α ile volanları yarıştır.',
  heading:'Tork ve dönme: cisimleri ne döndürür',
  intro:'Bir kuvvet, eksenden belli bir uzaklıkta etki ettiğinde cismi döndürür: τ = F·d. Tork, bir anahtarı ne kadar sert itmen gerektiğini, bir forkliftin devrilmeden ne kadar ağır bir yükü kaldırabileceğini ve bir tekerin ne kadar hızlı dönmeye başlayacağını belirler, τ = I·α.'
 },
 centre: {
  slug:'kutle-merkezi',name:'Kütle merkezi',summary:'Kütle merkezi, denge noktaları, bileşik cisimler ve devrilme.',
  title:'Kütle merkezi: denge üzerine eğitici simülasyon oyunları | Phisicos',
  description:'Kütle merkezi üzerine eğitici simülasyon oyunları. Bir kirişin denge noktasını bul, asılı bir oyuncağı aşağıdan yukarıya dengele ve blokları devrilmeden masanın kenarından taşacak şekilde üst üste koy.',
  heading:'Kütle merkezi: ağırlık nereye etki eder',
  intro:'Her cisim, tüm ağırlığı tek bir noktada, kütle merkezinde etki ediyormuş gibi davranır: x_cm = Σm·x ÷ Σm. Onu bu noktadan destekle, dengede kalır; kütle merkezi desteğin kenarını aştığında cisim devrilir.'
 },
 fluids: {
  slug:'akiskanlar',name:'Akışkanlar',summary:'Özkütle, kaldırma kuvveti, yüzme ve su altında ve havada basınç.',
  title:'Akışkanlar: özkütle, kaldırma kuvveti ve basınç üzerine eğitici simülasyon oyunları | Phisicos',
  description:'Akışkanlar üzerine eğitici simülasyon oyunları. Arşimet gibi özkütle ölç, bir mavnayı su güverteye ulaşana kadar yükle, bir taşı su altında tart, bir balonla yüksel, bir denizaltıyı gövdesinin izin verdiği kadar derine indir, havayı Torricelli tüpüyle tart ve Magdeburg yarım kürelerini ayırmayı dene.',
  heading:'Akışkanlar: özkütle, yüzme ve basınç',
  intro:'Her santimetreküpe ne kadar kütle sığdığı, neyin batıp neyin yüzeceğini belirler. Su, bir cismi onun yerini değiştirdiği suyun ağırlığına eşit bir kuvvetle yukarı iter ve derine indikçe daha güçlü bastırır: ρ = m ÷ V, F_b = ρ·g·V, p = p₀ + ρ·g·h.'
 },
 flow: {
  slug:'akis',name:'Akış',summary:'Akış, Bernoulli ilkesi, fışkıran su, borular ve kaldırma kuvveti.',
  title:'Akış: Bernoulli ilkesi üzerine eğitici simülasyon oyunları | Phisicos',
  description:'Hareket eden akışkanlar üzerine eğitici simülasyon oyunları. Delik bir tanktan fışkıran suyun nereye düşeceğini, daralan bir borunun suyu nasıl hızlandırıp basıncını düşürdüğünü ve hızlı rüzgârın bir çatıyı, bir kanadı ve bir kâğıt şeridi nasıl kaldırdığını tahmin et.',
  heading:'Akış: hareket eden akışkanlar ve Bernoulli ilkesi',
  intro:'Hareket eden akışkanlar basıncı hızla takas eder. Bir borunun her kesitinden her saniye aynı hacim geçer ve bir akım çizgisi boyunca basınç, hareket ve yükseklik her zaman aynı değere ulaşır: A·v = sabit, p + ½·ρ·v² + ρ·g·h = sabit.'
 },
 oscillations: {
  slug:'salinimlar',name:'Salınımlar',summary:'Genlik, periyot, frekans, sarkaçlar, yaylar, enerji ve rezonans.',
  title:'Salınımlar: harmonik hareket üzerine eğitici simülasyon oyunları | Phisicos',
  description:'Salınımlar üzerine eğitici simülasyon oyunları. Periyotları, frekansları ve genlikleri bul, bir sarkaçlı saati ayarla, bir yıkım topunu salla, büyük salınımların nasıl yavaşlayıp söndüğünü izle, yayları birleştir ve onlarla atış yap, bir salıncağı ritmine uygun it.',
  heading:'Salınımlar: harmonik hareket ve rezonans',
  intro:'Bir sarkaç ya da yaya bağlı bir kütle, salınımın büyüklüğünden bağımsız olarak kendi sabit ritmiyle ileri geri salınır. Enerji hareketle depolanma arasında gidip gelir ve salınımın ritmine uygun itmeler büyük bir hareket oluşturur: T = 2π·√(L ÷ g), T = 2π·√(m ÷ k), E = ½·k·A².'
 },
 waves: {
  slug:'dalgalar',name:'Dalgalar',summary:'Dalga nedir, genlik, dalga boyu, frekans, periyot ve ses.',
  title:'Dalgalar: dalga boyu ve frekans üzerine eğitici simülasyon oyunları | Phisicos',
  description:'Dalgalar üzerine eğitici simülasyon oyunları. Bir ip boyunca bir atma gönder ve gerçekte neyin ilerlediğini gör, dalgacıkların yayıldıkça nasıl küçüldüğünü izle, bir ipin taşıdığı gücü ölç, dalga boyunu bulmak için dalgaları say, bir dalga leğeninde dalgacıkları ölç, bir radyo antenini boyuna göre ayarla, bir teli akort et, bir dalgayı stroboskopla dondur, bir sörfçünün dalgalar arasındaki bekleme süresini ölç, gelgitin periyodunu bul, gerilmenin ve ağırlığın bir ipteki dalga hızını nasıl belirlediğini gör, okyanusta bir tsunamiyle yarış, enine ve boyuna dalgaları ayırt etmek için bir yayı salla ve it, bir depremi P ve S dalgalarından bul, deniz tabanını yankıyla tara, dalgacıkları bir duvardan, atmaları sabit ve serbest uçtan yansıt, dalgaların sığ suda nasıl büküldüğünü izle, suyun altındaki balığın gerçekte nerede olduğunu bul, iki hoparlör arasındaki sessiz noktaları bul, bir teli vurularla akort et, limana girişin arkasındaki demirli teknelerden hangilerinin sallandığını gör, bir lazerin dalga boyunu bir yarıkla ölç, geçen bir ambulansın sireninin perdesinin nasıl değiştiğini duy, yüzen bir ördeğin önünde dalgacıkların sıklaştığını izle, hoparlörler açılırken desibelmetreyi oku, bir şişeyle notalar çal, frekans ve hızı v = f·λ ile ilişkilendir ve bir fırtınanın ve bir uçurumun yerini bulmak için sesi yavaşlat.',
  heading:'Dalgalar: ne ilerler ve ne kadar hızlı',
  intro:'Bir dalga, enerjiyi ve biçimi bir yerden başka bir yere taşır; ortam ise yalnızca ileri geri titreşir. Frekansı, dalga boyu ve hızı birbirine bağlıdır: v = f·λ, T = 1 ÷ f.'
 }
},
tagsUi: {label:'Koleksiyon',collections:'Koleksiyonlar',alsoIn:'Şurada da',gamesHeading:'Bu koleksiyondaki oyunlar',howHeading:'Her oyun bunu nasıl kullanır',eqPosition:'Konum',eqVelocity:'Hız',eqTime:'Zaman',eqForces:'Kuvvet dengesi',eqTorques:'Tork dengesi'},
tags: {
 'uniform-motion': {
  slug:'duzgun-dogrusal-hareket',name:'Düzgün doğrusal hareket',summary:'Bir doğru boyunca sabit hız: x = x₀ + v·t.',
  title:'Düzgün doğrusal hareket (sabit hız): eğitici simülasyon oyunları | Phisicos',
  description:'Düzgün doğrusal hareket, yani bir doğru boyunca sabit hız üzerine eğitici simülasyon oyunları. Konumları x = x₀ + v·t ile tahmin et, x–t grafiklerini oku ve bir kovalamacanın süresini ölç.',
  heading:'Düzgün doğrusal hareket: bir doğru boyunca sabit hız',
  intro:'Düzgün doğrusal hareket yapan bir cisim, eşit zaman aralıklarında hep aynı yönde eşit yollar alır. İki konudan gelen bu oyunların hepsi onu kullanır: konumları tahmin etmek, doğru biçimindeki grafikleri okumak ve süreleri hesaplamak için oyna.',
  lessonTitle:'Düzgün doğrusal hareketin denklemleri',
  lesson:'Sabit bir v hızında konum her saniye aynı miktarda değişir, dolayısıyla x = x₀ + v·t olur ve x–t grafiği eğimi v olan bir doğrudur. Hız, yer değiştirmenin zamana bölümüdür, v = Δx ÷ Δt; d yolunu v süratiyle almanın süresi t = d ÷ v\'dir. Negatif v, −x yönünde hareket demektir. İvme sıfırdır.',
  notes: {
   track:'Tren her zaman 20 m/s ile gider. Farklı referans noktalarına göre son konumunu ve yer değiştirmesini tahmin et.',
   dog:'Yürüyüşün her bölümü sabit hızlıdır, bu yüzden x–t grafiği düz parçalardan oluşur. Konumları ve yer değiştirmeleri ondan oku.',
   lift:'Asansör katlar arasında 2 m/s sabit hızla gider. Alınan yolu yer değiştirmeyle karşılaştır.',
   game:'Laboratuvarın düz pistinde sıfır ivmeyle ve Pac-Man kovalamacasında: 4 − 2 = 2 m/s ile kapatılacak 12 m varken yakalama 6 s sürer.',
   scale:'Her yolculuk sabit süratle yapılır: SI ön eklerini dönüştürdükten sonra t = d ÷ v\'yi hesapla.'
  }
 },
 equilibrium: {
  slug:'kuvvet-dengesi',name:'Kuvvet dengesi',summary:'Birbirini dengeleyen kuvvetler ve torklar: ΣF = 0 ve ΣM = 0.',
  title:'Kuvvet dengesi (statik): eğitici simülasyon oyunları | Phisicos',
  description:'Kuvvet dengesi üzerine eğitici simülasyon oyunları: bir kuvvet masasını dengele, bir tabelayı iplere as, bir tahterevalliyi dengele ve bir yaya köprüsünün destek tepkilerini bul.',
  heading:'Kuvvet dengesi: her şey birbirini dengelediğinde',
  intro:'Dengedeki bir cisim, ona etki eden kuvvetler ve döndürme etkileri birbirini dengelediği için durgun kalır. İki konudan gelen bu oyunların hepsi bunu kullanır: vektörleri dengelemek, ipleri seçmek, ağırlıkları bir kaldıraç üzerine yerleştirmek ve yükü desteklere paylaştırmak için oyna.',
  lessonTitle:'Dengenin iki koşulu',
  lesson:'Durgun bir cisim, ancak ona etki eden kuvvetlerin vektörel toplamı sıfırsa durgun kalır, ΣF = 0: bileşenlerle ΣFₓ = 0 ve ΣF_y = 0; uç uca çizilen kuvvetler kapalı bir çokgen oluşturur. Cisim dönmeye de başlayamaz, bu yüzden herhangi bir noktaya göre torklar birbirini dengelemelidir, ΣM = 0; burada her tork, kuvvetin o noktaya dik uzaklığıyla çarpımıdır, M = F·d. Tek bir noktada etki eden kuvvetler için ilk koşul yeterlidir; bir yaya köprüsü, bir kaldıraç ya da bir köprü ikisine de ihtiyaç duyar.',
  notes: {
   forces:'Üç ip bir halkayı farklı açılarla çeker. Halkanın merkezde kalması için vektörel toplamı sıfırlayan kuvveti bul.',
   sign:'Tabela bir ya da iki ipe asılı. Her gerilmeyi bileşenlerine ayır ve ΣF = 0 ile her ipin ne kadar sağlam olması gerektiğini bul.',
   seesaw:'Çocuklar dönme ekseninden farklı uzaklıklarda oturuyor. Tahtanın kendi ağırlığını da hesaba katarak torkları ΣM = 0 ile dengele.',
   bridge:'Yaya köprüsü iki desteğe dayanıyor. Her tepkiyi ve bir desteğin kırıldığı ya da köprünün devrildiği yeri bulmak için ΣF = 0 ile ΣM = 0\'ı birlikte kullan.'
  }
 }
}
};
