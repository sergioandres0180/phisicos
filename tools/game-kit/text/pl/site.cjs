// Polish site shell: static page content, topic and collection copy. Installed by tools/game-kit/add-lang.cjs.
module.exports = {
pages: {
 name:'Polski',home:'/pl/',game:'/pl/gry/ruch/szybkosc-predkosc/',locale:'pl_PL',
 homeTitle:'Edukacyjne gry symulacyjne z fizyki | Phisicos',
 gameTitle:'Szybkość i prędkość: edukacyjna gra symulacyjna | Phisicos',
 homeDescription:'Graj za darmo w edukacyjne gry symulacyjne w przeglądarce. Sprawdzaj swoje przewidywania dotyczące szybkości, prędkości, grawitacji i przyspieszenia dzięki pomiarom na żywo.',
 gameDescription:'Edukacyjna gra symulacyjna o szybkości i prędkości, z laboratorium fizycznym i pościgiem Pac-Mana. Badaj drogę, przemieszczenie i przyspieszenie w interaktywny sposób.',
 homeLabel:'Strona główna',gameLabel:'Szybkość i prędkość',language:'Język',skip:'Przejdź do treści',games:'Edukacyjne gry symulacyjne',
 hero:'Edukacyjne gry symulacyjne<br>do nauki fizyki.',heroLabel:'Poznaj ruch · Baw się fizyką',
 lead:'Przewiduj. Zmieniaj ruch. Zobacz, co pokażą pomiary.',
 available:'ZAGRAJ TERAZ',cardTitle:'Szybkość i prędkość',
 cardCopy:'Złap ruchomy cel albo wyślij cząstkę po torze. Odkryj, dlaczego dłuższa droga nie zawsze oznacza większą odległość od punktu startu.',
 play:'Zagraj w symulację o szybkości i prędkości',lab:'Laboratorium fizyczne',chase:'Pościg Pac-Mana',
 topic:'KINEMATYKA · POMIARY · WZORY · WEKTORY · TRYGONOMETRIA · RZUTY · RUCH PO OKRĘGU · GRAWITACJA · STATYKA',
 gamesMenu:'Gry',
 later:'Kolejne edukacyjne gry symulacyjne są w przygotowaniu.',laterCopy:'Ta kolekcja zaczyna się od ruchu. Nowe gry pojawią się tutaj, gdy tylko będą gotowe.',
 homeLearn:'Edukacyjne gry symulacyjne, które zamieniają pytania w eksperymenty',
 homeBody:'Dzięki Phisicos badasz jedną ideę naraz. Każda edukacyjna gra symulacyjna łączy sterowany model fizyczny z wyzwaniem: goń ducha, by powiązać drogę, czas i kierunek, albo wyląduj modułem, równoważąc grawitację i ciąg silnika.',
 homeSteps:['Przewidź, jak potoczy się ruch.','Uruchom, zatrzymaj albo przesuń czas o 0,10 sekundy.','Porównaj pomiary i wyjaśnij wynik.'],
 gameHeading:'Szybkość i prędkość: edukacyjna gra symulacyjna',
 guideTitle:'Jak grać w grę o szybkości i prędkości',
 steps:['Wybierz laboratorium fizyczne, aby badać tor prosty lub kołowy, albo wybierz pościg Pac-Mana.','Ustaw szybkość i kierunek. W laboratorium możesz też zmienić przyspieszenie styczne.','Przewidź, co się stanie, i uruchom ruch. Zatrzymaj go lub przesuń krok naprzód, aby odczytać pomiary.','Wykonaj kurs tam i z powrotem albo pełne okrążenie. Po powrocie na start porównaj szybkość średnią z prędkością średnią.'],
 lessonTitle:'Czego ta edukacyjna gra symulacyjna uczy o prędkości',
 lesson:'Szybkość mówi, jak szybko coś się porusza. Prędkość uwzględnia też kierunek. Szybkość średnia to całkowita droga podzielona przez czas, a prędkość średnia to przemieszczenie podzielone przez czas. Zakręt może zmienić prędkość, nawet gdy szybkość pozostaje stała.',
 exampleTitle:'Spróbuj: złap ducha w 6 sekund',
 example:'Duch startuje 12 m przed Pac-Manem. Gdy Pac-Man biegnie z szybkością 4 m/s, a duch 2 m/s w tym samym kierunku, odległość maleje o 2 m/s. Przewidywany czas złapania to 12 ÷ (4 − 2) = 6 s. Zmień jedną z szybkości i sprawdź kolejne przewidywanie.',
 faqTitle:'Pytania o szybkość i prędkość',
 faq:[['Czy prędkość średnia może być zerowa, gdy szybkość średnia jest dodatnia?','Tak. Obiegnij tor pościgu o długości 48 m i wróć na start po 12 s. Twoja szybkość średnia wynosi 48 ÷ 12 = 4 m/s, a przemieszczenie i prędkość średnia są równe zeru.'],['Co się dzieje, gdy zmieniam kierunek?','Wektor prędkości zmienia kierunek. Całkowita droga wciąż rośnie, a przemieszczenie zależy tylko od położenia początkowego i bieżącego.'],['Czy muszę coś instalować?','Nie. Obie aktywności działają w nowoczesnej przeglądarce dzięki HTML5 Canvas. Korzystaj z przycisków na ekranie za pomocą myszy, dotyku lub klawiatury.']],
 back:'Zobacz wszystkie edukacyjne gry symulacyjne',footer:'Badaj → przewiduj → mierz → wyjaśniaj',notFound:'Nie znaleziono strony',missing:'Ta strona jest niedostępna. Wybierz grę na stronie głównej.'
},
section:'/pl/gry/',
index: {
 label:'Działy',
 title:'Działy fizyki i matematyki: edukacyjne gry symulacyjne | Phisicos',
 description:'Przeglądaj edukacyjne gry symulacyjne według działów: ruch, pomiary, wzory, wektory, trygonometria, rzuty, ruch po okręgu, grawitacja, statyka, moment siły i obroty, środek masy, płyny, przepływy, drgania i fale. Każdy dział zbiera gry, które krok po kroku budują tę samą ideę.',
 heading:'Przeglądaj edukacyjne gry symulacyjne według działów',
 intro:'Wybierz dział, aby zobaczyć jego gry w proponowanej kolejności. Każda gra łączy działającą symulację z przewidywaniem, które możesz sprawdzić.'
},
ui: {browse:'Przeglądaj według działów',all:'Wszystkie działy',count:'Liczba gier: {n}',other:'Inne działy',eyebrow:'Dział',gamesHeading:'Gry w tym dziale'},
topics: {
 motion: {
  slug:'ruch',name:'Ruch',summary:'Położenie, prędkość, przyspieszenie i grawitacja.',
  title:'Ruch: edukacyjne gry symulacyjne o szybkości, prędkości i przyspieszeniu | Phisicos',
  description:'Edukacyjne gry symulacyjne o ruchu. Porównaj szybkość z prędkością, odczytaj przyspieszenie z wykresu, zahamuj przed linią i wyląduj modułem, równoważąc grawitację i ciąg.',
  heading:'Ruch: szybkość, prędkość i przyspieszenie',
  intro:'Zacznij tutaj, aby zobaczyć, jak położenie, prędkość i przyspieszenie zmieniają się w czasie. Przewidź czas złapania albo bezpieczne lądowanie, a potem zmierz, co naprawdę się dzieje.'
 },
 measurement: {
  slug:'pomiary',name:'Pomiary',summary:'Jednostki, przedrostki SI i notacja wykładnicza.',
  title:'Pomiary: edukacyjne gry symulacyjne o jednostkach i potęgach dziesięciu | Phisicos',
  description:'Edukacyjne gry symulacyjne o pomiarach. Przeliczaj jednostki dokładnymi współczynnikami i używaj przedrostków SI oraz notacji wykładniczej od mikrometrów po megametry.',
  heading:'Pomiary: jednostki, przedrostki i notacja wykładnicza',
  intro:'Każdy wynik w fizyce potrzebuje jednostki. Te gry ćwiczą przeliczanie jednostek, przedrostki SI i notację wykładniczą na wielkościach, które możesz obserwować.'
 },
 formulas: {
  slug:'wzory',name:'Wzory',summary:'Przekształcanie wzorów: działania odwrotne i sprawdzanie jednostek.',
  title:'Wzory: edukacyjne gry symulacyjne o przekształcaniu równań | Phisicos',
  description:'Edukacyjne gry symulacyjne o przekształcaniu wzorów. Utrzymuj równanie w równowadze, cofaj działania w odwrotnej kolejności i sprawdź przekształcony wzór na jadącym samochodzie.',
  heading:'Wzory: najpierw przekształć, potem licz',
  intro:'Wzór fizyczny można rozwiązać względem każdej występującej w nim litery. Wyznacz niewiadomą, wykonując to samo po obu stronach, cofaj działania w odwrotnej kolejności i sprawdź jednostki wyniku.'
 },
 vectors: {
  slug:'wektory',name:'Wektory',summary:'Dodawanie wektorów, przemieszczenie i siły.',
  title:'Wektory: edukacyjne gry symulacyjne o dodawaniu wektorów | Phisicos',
  description:'Edukacyjne gry symulacyjne o wektorach. Dodawaj prędkości podczas przeprawy przez rzekę, porównuj drogę z przemieszczeniem i równoważ siły, łącząc je koniec z początkiem.',
  heading:'Wektory: kierunek ma znaczenie',
  intro:'Wektor ma wartość i kierunek. Te gry pokazują, kiedy wielkości dodaje się jak liczby, a kiedy łączy się je koniec z początkiem.'
 },
 trigonometry: {
  slug:'trygonometria',name:'Trygonometria',summary:'Trójkąty prostokątne, funkcje odwrotne i okrąg jednostkowy.',
  title:'Trygonometria: edukacyjne gry symulacyjne o sinusie, cosinusie i tangensie | Phisicos',
  description:'Edukacyjne gry symulacyjne z podstaw trygonometrii. Rozwiązuj trójkąty prostokątne, wyznaczaj kąty funkcjami odwrotnymi i odczytuj sinus i cosinus na okręgu jednostkowym.',
  heading:'Trygonometria: kąty i boki',
  intro:'Trygonometria wiąże kąty z długościami. Zacznij od trójkątów prostokątnych, przejdź do kątów wzniesienia i obniżenia, a potem poprowadź sinus i cosinus dookoła całego okręgu.'
 },
 projectile: {
  slug:'rzuty',name:'Rzuty',summary:'Rzut poziomy i ukośny: dwa ruchy naraz.',
  title:'Rzuty: edukacyjne gry symulacyjne o ruchu ciał rzuconych | Phisicos',
  description:'Edukacyjne gry symulacyjne o rzutach. Zrzuć skrzynię z samolotu, rozłóż rzut na dwa cienie i wyceluj z armaty w cel.',
  heading:'Rzuty: dwa ruchy naraz',
  intro:'Rzucone ciało porusza się poziomo ze stałą prędkością, a jednocześnie spada ze stałym przyspieszeniem. Przewiduj czasy spadku, wysokości i zasięgi, rozpatrując oba ruchy osobno.'
 },
 circular: {
  slug:'ruch-po-okregu',name:'Ruch po okręgu',summary:'Ruch jednostajny po okręgu, prędkość kątowa i siła dośrodkowa.',
  title:'Ruch po okręgu: edukacyjne gry symulacyjne o zakrętach i obrotach | Phisicos',
  description:'Edukacyjne gry symulacyjne o ruchu po okręgu. Zmierz czas obrotu karuzeli, rozkręć stację kosmiczną, by uzyskać sztuczną grawitację, i sprawdź, jak szybko auto może pokonać zakręt.',
  heading:'Ruch po okręgu: ciągły skręt',
  intro:'Ciało poruszające się po okręgu ze stałą szybkością wciąż przyspiesza, bo jego kierunek nieustannie się zmienia. Zmierz prędkość kątową, przewidź przyspieszenie dośrodkowe i znajdź siłę, która utrzymuje ciało na łuku.'
 },
 gravitation: {
  slug:'grawitacja',name:'Grawitacja',summary:'Prawo powszechnego ciążenia Newtona, ciężar, orbity i prawa Keplera.',
  title:'Grawitacja: edukacyjne gry symulacyjne o powszechnym ciążeniu | Phisicos',
  description:'Edukacyjne gry symulacyjne o grawitacji. Zważ astronautę na innych światach, wyślij satelitę na orbitę i zmierz okresy księżyców i planet za pomocą trzeciego prawa Keplera.',
  heading:'Grawitacja: przyciąganie między masami',
  intro:'Każda masa przyciąga każdą inną masę siłą F = G·M·m ÷ r². To jedno prawo wyznacza twój ciężar na Księżycu, utrzymuje satelity na orbicie i ustala, ile czasu każda planeta potrzebuje na okrążenie Słońca.'
 },
 statics: {
  slug:'statyka',name:'Statyka',summary:'Równowaga sił, naciąg lin, moment siły i reakcje podpór.',
  title:'Statyka: edukacyjne gry symulacyjne o równowadze sił | Phisicos',
  description:'Edukacyjne gry symulacyjne o statyce. Dobierz liny wystarczająco mocne, by powiesić szyld, zrównoważ huśtawkę momentami sił i wyznacz reakcje podpór pod obciążoną kładką.',
  heading:'Statyka: gdy siły się znoszą',
  intro:'Ciało pozostaje w spoczynku, gdy działające na nie siły się znoszą, ΣF = 0, i znoszą się również ich działania obrotowe, ΣM = 0. Te dwa warunki wyznaczają wytrzymałość każdej liny, miejsce każdego dziecka na huśtawce i obciążenie każdej podpory mostu.'
 },
 rotation: {
  slug:'moment-sily-i-obroty',name:'Moment siły i obroty',summary:'Moment siły, ramię siły, przewracanie i przyspieszenie kątowe.',
  title:'Moment siły i obroty: edukacyjne gry symulacyjne o momencie siły | Phisicos',
  description:'Edukacyjne gry symulacyjne o momencie siły i obrotach. Odkręć kluczem zardzewiałą śrubę, nie dopuść do przewrócenia obciążonego wózka widłowego i ścigaj się kołami zamachowymi z τ = I·α.',
  heading:'Moment siły i obroty: co wprawia ciała w obrót',
  intro:'Siła obraca ciało, gdy działa w pewnej odległości od osi: τ = F·d. Moment siły decyduje, jak mocno pchać klucz, jak ciężki ładunek uniesie wózek widłowy bez przewrócenia się i jak szybko rozpędzi się koło, τ = I·α.'
 },
 centre: {
  slug:'srodek-masy',name:'Środek masy',summary:'Środek masy, punkty podparcia, ciała złożone i przewracanie.',
  title:'Środek masy: edukacyjne gry symulacyjne o równowadze | Phisicos',
  description:'Edukacyjne gry symulacyjne o środku masy. Znajdź punkt równowagi belki, wyważ wiszącą zabawkę od dołu do góry i ułóż klocki poza krawędzią stołu tak, by się nie przewróciły.',
  heading:'Środek masy: gdzie działa ciężar',
  intro:'Każde ciało zachowuje się tak, jakby cały jego ciężar działał w jednym punkcie, środku masy: x_cm = Σm·x ÷ Σm. Podeprzyj je w tym punkcie, a zachowa równowagę; gdy środek masy wyjdzie poza krawędź podparcia, ciało się przewróci.'
 },
 fluids: {
  slug:'plyny',name:'Płyny',summary:'Gęstość, wypór, pływanie i ciśnienie pod wodą i w powietrzu.',
  title:'Płyny: edukacyjne gry symulacyjne o gęstości, wyporze i ciśnieniu | Phisicos',
  description:'Edukacyjne gry symulacyjne o płynach. Zmierz gęstość jak Archimedes, ładuj barkę, aż woda sięgnie pokładu, zważ kamień pod wodą, wznieś się balonem, zanurz łódź podwodną tak głęboko, jak pozwala kadłub, zważ powietrze rurką Torricellego i spróbuj rozerwać półkule magdeburskie.',
  heading:'Płyny: gęstość, pływanie i ciśnienie',
  intro:'To, ile masy mieści się w każdym centymetrze sześciennym, decyduje, co tonie, a co pływa. Woda wypycha ciało w górę siłą równą ciężarowi wypartej przez nie wody i naciska tym mocniej, im głębiej się zanurzysz: ρ = m ÷ V, F_b = ρ·g·V, p = p₀ + ρ·g·h.'
 },
 flow: {
  slug:'przeplywy',name:'Przepływy',summary:'Przepływ, prawo Bernoulliego, strumienie, rury i siła nośna.',
  title:'Przepływy: edukacyjne gry symulacyjne o prawie Bernoulliego | Phisicos',
  description:'Edukacyjne gry symulacyjne o płynach w ruchu. Przewidź, gdzie spadnie strumień z dziurawego zbiornika, jak zwężenie rury przyspiesza wodę i obniża jej ciśnienie i jak szybki wiatr unosi dach, skrzydło i pasek papieru.',
  heading:'Przepływy: ruch płynów i prawo Bernoulliego',
  intro:'Płyny w ruchu wymieniają ciśnienie na prędkość. Przez każdy przekrój rury w każdej sekundzie przepływa ta sama objętość, a wzdłuż strugi ciśnienie, ruch i wysokość zawsze sumują się do tej samej wartości: A·v = const, p + ½·ρ·v² + ρ·g·h = const.'
 },
 oscillations: {
  slug:'drgania',name:'Drgania',summary:'Amplituda, okres, częstotliwość, wahadła, sprężyny, energia i rezonans.',
  title:'Drgania: edukacyjne gry symulacyjne o ruchu harmonicznym | Phisicos',
  description:'Edukacyjne gry symulacyjne o drganiach. Wyznaczaj okresy, częstotliwości i amplitudy, wyreguluj zegar wahadłowy, rozhuśtaj kulę wyburzeniową, obserwuj, jak duże wahania zwalniają i zanikają, łącz sprężyny i strzelaj nimi oraz popychaj huśtawkę w rytm.',
  heading:'Drgania: ruch harmoniczny i rezonans',
  intro:'Wahadło lub ciężarek na sprężynie waha się tam i z powrotem we własnym, stałym rytmie, niezależnie od wielkości wychylenia. Energia przepływa między ruchem a magazynowaniem, a pchnięcia w rytm drgań budują duży ruch: T = 2π·√(L ÷ g), T = 2π·√(m ÷ k), E = ½·k·A².'
 },
 waves: {
  slug:'fale',name:'Fale',summary:'Czym jest fala, amplituda, długość fali, częstotliwość, okres i dźwięk.',
  title:'Fale: edukacyjne gry symulacyjne o długości fali i częstotliwości | Phisicos',
  description:'Edukacyjne gry symulacyjne o falach. Wyślij impuls wzdłuż liny i zobacz, co naprawdę się przemieszcza, obserwuj, jak zmarszczki maleją, rozchodząc się, zmierz moc niesioną przez linę, policz fale, by znaleźć ich długość, zmierz zmarszczki w kuwecie, dobierz długość anteny radiowej, nastrój strunę, zatrzymaj falę stroboskopem, zmierz czas oczekiwania surfera między falami, wyznacz okres pływów, zobacz, jak naciąg i ciężar ustalają prędkość fali na linie, ścigaj się z tsunami przez ocean, potrząsaj sprężyną i pchaj ją, by odróżnić fale poprzeczne od podłużnych, zlokalizuj trzęsienie ziemi z fal P i S, zbadaj dno morza echem, odbijaj zmarszczki od ściany, a impulsy od sztywnego i swobodnego końca, obserwuj, jak fale zakręcają nad mielizną, znajdź, gdzie naprawdę jest ryba pod wodą, znajdź ciche miejsca między dwoma głośnikami, nastrój strunę na dudnienia, zobacz, które cumujące łodzie kołyszą się za wejściem do portu, zmierz długość fali lasera szczeliną, usłysz, jak zmienia się wysokość syreny przejeżdżającej karetki, obserwuj zagęszczanie się zmarszczek przed płynącą kaczką, odczytaj miernik decybeli, gdy włączają się głośniki, zagraj nuty na butelce, powiąż częstotliwość i prędkość wzorem v = f·λ i spowolnij dźwięk, aby zlokalizować burzę i urwisko.',
  heading:'Fale: co się przemieszcza i jak szybko',
  intro:'Fala przenosi energię i kształt z miejsca na miejsce, a ośrodek jedynie drga tam i z powrotem. Jej częstotliwość, długość i prędkość są ze sobą powiązane: v = f·λ, T = 1 ÷ f.'
 }
},
tagsUi: {label:'Kolekcja',collections:'Kolekcje',alsoIn:'Także w',gamesHeading:'Gry w tej kolekcji',howHeading:'Jak wykorzystuje to każda gra',eqPosition:'Położenie',eqVelocity:'Prędkość',eqTime:'Czas',eqForces:'Równowaga sił',eqTorques:'Równowaga momentów'},
tags: {
 'uniform-motion': {
  slug:'ruch-jednostajny-prostoliniowy',name:'Ruch jednostajny prostoliniowy',summary:'Stała prędkość wzdłuż prostej: x = x₀ + v·t.',
  title:'Ruch jednostajny prostoliniowy (stała prędkość): edukacyjne gry symulacyjne | Phisicos',
  description:'Edukacyjne gry symulacyjne o ruchu jednostajnym prostoliniowym, czyli o stałej prędkości wzdłuż prostej. Przewiduj położenia wzorem x = x₀ + v·t, odczytuj wykresy x–t i mierz czas pościgu.',
  heading:'Ruch jednostajny prostoliniowy: stała prędkość wzdłuż prostej',
  intro:'Ciało w ruchu jednostajnym prostoliniowym pokonuje równe odcinki w równych odstępach czasu, zawsze w tym samym kierunku. Wszystkie te gry z dwóch działów z niego korzystają: zagraj, aby przewidywać położenia, odczytywać wykresy w postaci prostych i obliczać czasy.',
  lessonTitle:'Równania ruchu jednostajnego prostoliniowego',
  lesson:'Przy stałej prędkości v położenie zmienia się co sekundę o tyle samo, więc x = x₀ + v·t, a wykres x–t jest linią prostą o nachyleniu v. Prędkość to przemieszczenie podzielone przez czas, v = Δx ÷ Δt, a czas pokonania drogi d z szybkością v wynosi t = d ÷ v. Ujemne v oznacza ruch w kierunku −x. Przyspieszenie jest równe zeru.',
  notes: {
   track:'Pociąg zawsze jedzie z prędkością 20 m/s. Przewidź jego położenie końcowe i przemieszczenie względem różnych punktów odniesienia.',
   dog:'Każdy odcinek spaceru ma stałą prędkość, więc wykres x–t składa się z prostych odcinków. Odczytaj z niego położenia i przemieszczenia.',
   lift:'Winda jedzie między piętrami ze stałą prędkością 2 m/s. Porównaj przebytą drogę z przemieszczeniem.',
   game:'Na prostym torze laboratorium przy zerowym przyspieszeniu oraz w pościgu Pac-Mana: przy 12 m do nadrobienia z szybkością 4 − 2 = 2 m/s złapanie trwa 6 s.',
   scale:'Każda podróż odbywa się ze stałą szybkością: po przeliczeniu przedrostków SI oblicz t = d ÷ v.'
  }
 },
 equilibrium: {
  slug:'rownowaga-sil',name:'Równowaga sił',summary:'Siły i momenty sił, które się znoszą: ΣF = 0 i ΣM = 0.',
  title:'Równowaga sił (statyka): edukacyjne gry symulacyjne | Phisicos',
  description:'Edukacyjne gry symulacyjne o równowadze sił: zrównoważ stolik sił, powieś szyld na linach, wypoziomuj huśtawkę i wyznacz reakcje podpór pod kładką.',
  heading:'Równowaga sił: gdy wszystko się znosi',
  intro:'Ciało w równowadze pozostaje w spoczynku, ponieważ działające na nie siły i ich działania obrotowe się znoszą. Wszystkie te gry z dwóch działów z tego korzystają: zagraj, aby równoważyć wektory, dobierać liny, rozmieszczać ciężary na dźwigni i dzielić obciążenie między podpory.',
  lessonTitle:'Dwa warunki równowagi',
  lesson:'Ciało w spoczynku pozostaje w spoczynku tylko wtedy, gdy wektorowa suma działających na nie sił jest równa zeru, ΣF = 0: w składowych ΣFₓ = 0 i ΣF_y = 0, a siły narysowane koniec z początkiem tworzą zamknięty wielokąt. Ciało nie może też zacząć się obracać, więc momenty sił względem dowolnego punktu muszą się znosić, ΣM = 0, gdzie każdy moment to siła razy jej odległość prostopadła od punktu, M = F·d. Siłom działającym w jednym punkcie wystarcza pierwszy warunek; kładka, dźwignia czy most potrzebują obu.',
  notes: {
   forces:'Trzy linki ciągną pierścień pod różnymi kątami. Znajdź siłę, która zeruje sumę wektorową, aby pierścień pozostał na środku.',
   sign:'Szyld wisi na jednej lub dwóch linach. Rozłóż każdy naciąg na składowe i z ΣF = 0 wyznacz, jak mocna musi być każda lina.',
   seesaw:'Dzieci siedzą w różnych odległościach od osi obrotu. Zrównoważ momenty sił z ΣM = 0, uwzględniając ciężar samej deski.',
   bridge:'Kładka spoczywa na dwóch podporach. Użyj razem ΣF = 0 i ΣM = 0, aby wyznaczyć każdą reakcję oraz miejsce, w którym podpora pęka lub kładka się przechyla.'
  }
 }
}
};
