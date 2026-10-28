/* lang.js — اللغات: جداول الترجمة (عربي/كوردی) والقاموس التلقائي */
const W=[
['Search by product name or code','ابحث باسم المنتج أو الكود','بە ناوی بەرهەم یان کۆد بگەڕێ'],
['Our most loved products.','منتجاتنا الأكثر حباً لدى الزبائن.','خۆشەویستترین بەرهەمەکانمان.'],
['Current discounts on selected products.','تخفيضات حالية على منتجات مختارة.','داشکاندنی ئێستا لەسەر بەرهەمە هەڵبژێردراوەکان.'],
['Find your routine. Search above by name or product code.','اكتشف روتينك. ابحث بالأعلى باسم المنتج أو كوده.','ڕۆتینی خۆت بدۆزەرەوە. لە سەرەوە بە ناو یان کۆدی بەرهەم بگەڕێ.'],
['No account needed. It takes a minute.','لا تحتاج إلى حساب. الطلب يستغرق دقيقة.','پێویستت بە هەژمار نییە. تەنها خولەکێک دەخایەنێت.'],
['Browse and add products to your bag.','تصفّح المنتجات وأضفها إلى السلة.','بەرهەمەکان ببینە و بیانخە ناو سەبەتەکەت.'],
['Open your bag and apply a discount code if you have one.','افتح السلة وأدخل كود الخصم إن وجد.','سەبەتەکەت بکەرەوە و ئەگەر کۆدی داشکاندنت هەیە بینووسە.'],
['Enter your name, phone number and address.','أدخل اسمك ورقم هاتفك وعنوانك.','ناو و ژمارەی تەلەفۆن و ناونیشانەکەت بنووسە.'],
['Place the order. We confirm it by phone.','أرسل الطلب وسنؤكده معك عبر الهاتف.','داواکارییەکە بنێرە و بە تەلەفۆن پشتڕاستی دەکەینەوە.'],
['What our customers say.','ماذا يقول زبائننا.','کڕیارەکانمان چی دەڵێن.'],
['Your bag','سلتك','سەبەتەکەت'],['Your details','بياناتك','زانیارییەکانت'],['Order placed','تم إرسال الطلب','داواکاری نێردرا'],['Order','الطلب','داواکاری'],['Order code','كود الطلب','کۆدی داواکاری'],['Thank you,','شكراً لك،','سوپاس،'],
['Continue shopping','متابعة التسوق','بەردەوامبە لە کڕین'],['Your bag is empty. Add a product to start.','سلتك فارغة. أضف منتجاً للبدء.','سەبەتەکەت بەتاڵە. بەرهەمێک زیاد بکە.'],['Browse products','تصفّح المنتجات','بەرهەمەکان ببینە'],
['Subtotal','المجموع الفرعي','کۆی بنەڕەتی'],['Total','المجموع','کۆی گشتی'],['Discount','خصم','داشکاندن'],['Full name','الاسم الكامل','ناوی تەواو'],['Phone number','رقم الهاتف','ژمارەی تەلەفۆن'],['Full address','العنوان الكامل','ناونیشانی تەواو'],
['Place order','إرسال الطلب','ناردنی داواکاری'],['Back to bag','العودة إلى السلة','گەڕانەوە بۆ سەبەتە'],['Discount code','كود الخصم','کۆدی داشکاندن'],['Apply','تطبيق','جێبەجێکردن'],['Checkout','إتمام الطلب','تەواوکردنی داواکاری'],
['Add to bag','أضف إلى السلة','بیخە ناو سەبەتە'],['Close','إغلاق','داخستن'],['Added to bag','تمت الإضافة إلى السلة','خرایە ناو سەبەتە'],['Code applied','تم تطبيق الكود','کۆدەکە جێبەجێکرا'],['Invalid code','الكود غير صحيح','کۆدەکە دروست نییە'],
['No products match. Try another name or code.','لا توجد منتجات مطابقة. جرّب اسماً أو كوداً آخر.','هیچ بەرهەمێک نەدۆزرایەوە. ناو یان کۆدێکی تر تاقی بکەرەوە.'],
['No offers right now. Check back soon.','لا توجد عروض حالياً. عد قريباً.','ئێستا هیچ ئۆفەرێک نییە. دواتر سەردانمان بکەرەوە.'],
['Reviews from our customers will appear here.','ستظهر هنا آراء زبائننا.','ڕای کڕیارەکانمان لێرە دەردەکەون.'],
['Best sellers appear here once products are marked or ordered.','ستظهر هنا المنتجات الأكثر مبيعاً.','پڕفرۆشترین بەرهەمەکان لێرە دەردەکەون.'],
['No products at this discount level right now.','لا توجد منتجات بهذه النسبة حالياً.','ئێستا هیچ بەرهەمێک بەم ڕێژەیە نییە.'],
['Discounted by {n}% or more.','خصم {n}% أو أكثر.','{n}% داشکاندن یان زیاتر.'],
['View product','عرض المنتج','بینینی بەرهەم'],['All','الكل','هەموو'],['Cleansers','منظفات','پاککەرەوەکان'],['Serums','سيروم','سیرۆم'],['Moisturizers','مرطّبات','شێدارکەرەکان'],['Sun care','واقي الشمس','پاراستن لە هەتاو'],['Sending…','جارٍ الإرسال…','دەنێردرێت…'],['IQD','د.ع','د.ع'],
['We received your order and will call you soon to confirm it.','استلمنا طلبك وسنتصل بك قريباً لتأكيده.','داواکارییەکەت وەرگیرا و بەم زووانە پەیوەندیت پێوە دەکەین بۆ پشتڕاستکردنەوە.'],
['Your order is saved, but it could not reach the store. Please contact us and share your order code.','تم حفظ طلبك لكنه لم يصل إلى المتجر. يرجى التواصل معنا وإرسال كود الطلب.','داواکارییەکەت پاشەکەوت کرا، بەڵام نەگەیشتە فرۆشگا. تکایە پەیوەندیمان پێوە بکە و کۆدی داواکارییەکە بنێرە.'],
['Free delivery on orders over 50,000 IQD. Use code WELCOME10 for 10% off.','توصيل مجاني للطلبات فوق 50,000 دينار. استخدم الكود WELCOME10 لخصم 10%.','گەیاندنی بێبەرامبەر بۆ داواکاری سەرووی 50,000 دینار. کۆدی WELCOME10 بەکاربهێنە بۆ 10% داشکاندن.'],
['Gentle care for radiant skin','عناية لطيفة لبشرة مشرقة','چاودێرییەکی نەرم بۆ پێستێکی درەوشاوە'],
['Clean, simple skincare made to bring out your natural glow.','عناية نقية وبسيطة بالبشرة تُبرز إشراقتك الطبيعية.','چاودێری پاک و سادەی پێست بۆ دەرخستنی درەوشانەوەی سروشتیت.'],
['We deliver across Iraq in 2–4 days. Pay cash on delivery. We call you to confirm the order and the delivery fee.','نوصّل إلى جميع أنحاء العراق خلال 2–4 أيام. الدفع نقداً عند الاستلام. نتصل بك لتأكيد الطلب وأجرة التوصيل.','بۆ هەموو عێراق لە ماوەی 2–4 ڕۆژدا دەگەیەنین. پارە لە کاتی وەرگرتن دەدرێت. پەیوەندیت پێوە دەکەین بۆ پشتڕاستکردنەوەی داواکاری و کرێی گەیاندن.'],
['Shop now','تسوّق الآن','ئێستا بکڕە'],['Best sellers','الأكثر مبيعاً','پڕفرۆشترین'],['50% off','خصم 50%','50% داشکاندن'],['Offers','العروض','ئۆفەرەکان'],['Shop all','كل المنتجات','هەموو بەرهەمەکان'],['Delivery','التوصيل','گەیاندن'],['How to order','كيف تطلب','چۆن داوا دەکەیت'],['Customer reviews','آراء زبائننا','ڕای کڕیارەکانمان'],
['See all results','عرض كل النتائج','بینینی هەموو ئەنجامەکان'],
['Half-price favorites','مفضلاتك بنصف السعر','خۆشەویستەکانت بە نیوە نرخ'],['Selected products at 50% off for a limited time.','منتجات مختارة بخصم 50% لفترة محدودة.','بەرهەمی هەڵبژێردراو بە 50% داشکاندن بۆ ماوەیەکی سنووردار.'],
['Your daily glow routine','روتينك اليومي للإشراق','ڕۆتینی ڕۆژانەی درەوشانەوەت'],['Cleanser, serum and sunscreen. Everything for radiant skin.','غسول وسيروم وواقي شمس. كل ما تحتاجه لبشرة مشرقة.','پاککەرەوە و سیرۆم و پاراستن لە هەتاو. هەموو شتێک بۆ پێستێکی درەوشاوە.'],
['Storage full. Use a smaller image.','مساحة التخزين ممتلئة. استخدم صورة أصغر.','شوێنی هەڵگرتن پڕە. وێنەیەکی بچووکتر بەکاربهێنە.'],['Bag','السلة','سەبەتە'],['Language','اللغة','زمان'],['Track your order','تتبع طلبك','داواکارییەکەت بەدواداچوون بکە'],['Track','تتبع','بەدواداچوون'],['Track order','تتبع الطلب','بەدواداچوونی داواکاری'],['Brands','البراندات','براندەکان'],
['Received','تم الاستلام','وەرگیرا'],['Confirmed','تم التأكيد','پشتڕاستکرایەوە'],['Preparing','قيد التجهيز','ئامادە دەکرێت'],['Out for delivery','في الطريق إليك','لە ڕێگایە بۆ تۆ'],['Delivered','تم التسليم','گەیەندرا'],['Order cancelled','تم إلغاء الطلب','داواکاری هەڵوەشێنرایەوە'],
['Please enter a valid order code.','أدخل كود طلب صحيحاً.','کۆدی داواکارییەکی دروست بنووسە.'],['Checking…','جارٍ التحقق…','چاوەڕێ بکە…'],['Tracking is not available right now.','التتبع غير متاح حالياً.','بەدواداچوون ئێستا بەردەست نییە.'],['Order not found. Check the code.','الطلب غير موجود. تأكد من الكود.','داواکاری نەدۆزرایەوە. کۆدەکە بپشکنە.'],['Order code (LC-XXXXXX)','كود الطلب (LC-XXXXXX)','کۆدی داواکاری (LC-XXXXXX)'],['Other products','منتجات أخرى','بەرهەمی تر'],['More products for you.','منتجات أخرى قد تعجبك.','بەرهەمی تری گونجاو بۆ تۆ.'],['Home','الرئيسية','سەرەکی'],['Baghdad','بغداد','بەغدا'],['Nineveh (Mosul)','نينوى (الموصل)','نەینەوا (موسڵ)'],['Erbil','أربيل','هەولێر'],['Sulaymaniyah','السليمانية','سلێمانی'],['Duhok','دهوك','دهۆک'],['Kirkuk','كركوك','کەرکووک'],['Basra','البصرة','بەسرە'],['Najaf','النجف','نەجەف'],['Karbala','كربلاء','کەربەلا'],['Babylon','بابل','بابل'],['Anbar','الأنبار','ئەنبار'],['Diyala','ديالى','دیالە'],['Salah al-Din','صلاح الدين','سەلاحەدین'],['Wasit','واسط','واست'],['Maysan','ميسان','میسان'],['Dhi Qar','ذي قار','زیقار'],['Muthanna','المثنى','موسەنا'],['Al-Qadisiyyah','القادسية','قادسیە'],['Halabja','حلبجة','هەڵەبجە'],['Phone number (07XXXXXXXXX)','رقم الهاتف (07XXXXXXXXX)','ژمارەی مۆبایل (07XXXXXXXXX)'],['Choose city','اختر المدينة','شار هەڵبژێرە'],['Area / Neighborhood','المنطقة / الحي','ناوچە / گەڕەک'],['Nearest landmark','أقرب نقطة دالة','نزیکترین نیشانە'],['Enter a valid Iraqi mobile number: 11 digits starting with 07.','أدخل رقماً عراقياً صحيحاً من 11 رقماً يبدأ بـ 07.','ژمارەیەکی عێراقیی دروست بنووسە: ١١ ژمارە و بە 07 دەست پێبکات.'],['Please complete the address fields.','أكمل حقول العنوان.','خانەکانی ناونیشان تەواو بکە.'],['Similar products','منتجات مشابهة','بەرهەمی هاوشێوە'],['You may also like','قد يعجبك أيضاً','لەوانەیە حەزت لێبێت'],['results','نتيجة','ئەنجام'],['Send order on WhatsApp','أرسل الطلب عبر واتساب','داواکارییەکە بنێرە بە واتسئاپ'],['Contact us','تواصل معنا','پەیوەندیمان پێوە بکە'],['Skincare','سكن كير','چاودێری پێست'],['Cosmetics','كوزمتك','ئارایش'],
['Cleansers, serums, moisturizers and sun care.','غسولات وسيروم ومرطّبات وواقي شمس.','پاککەرەوە و سیرۆم و شێدارکەر و پاراستن لە هەتاو.'],['Lips, eyes and face makeup.','مكياج الشفاه والعيون والوجه.','ئارایشی لێو و چاو و ڕوخسار.'],
['Lips','شفاه','لێو'],['Eyes','عيون','چاو'],['Face','وجه','ڕوخسار'],
['Velvet Matte Lipstick','أحمر شفاه مات مخملي','ڕووژی لێوی مات مەخمەلی'],['Rich, long-wearing colour with a soft matte finish.','لون غني يدوم طويلاً بلمسة مات ناعمة.','ڕەنگێکی تێر و بەردەوام بە کۆتاییەکی مات و نەرم.'],
['Volume Lash Mascara','ماسكارا كثافة الرموش','ماسکارای زۆرکەری برژانگ'],['Defines and lifts lashes without clumping.','تحدد الرموش وترفعها بدون تكتل.','برژانگ دیار و بەرز دەکاتەوە بێ لکان.'],
['Skin-Like Foundation','كريم أساس بمظهر طبيعي','فاونديشنی سروشتی'],['Lightweight coverage that feels like skin.','تغطية خفيفة بإحساس البشرة الطبيعي.','داپۆشینێکی سووک وەک پێستی سروشتی.'],
['Soft Glow Blush','أحمر خدود بإشراقة ناعمة','سوورەی ڕومەت بە درەوشانەوەی نەرم'],['Buildable colour for a fresh, healthy flush.','لون قابل للتدرج لإشراقة صحية منعشة.','ڕەنگێکی دەتوانرێت زیاد بکرێت بۆ سوورییەکی تازە و ساغ.'],
['Gentle Foaming Cleanser','غسول رغوي لطيف','پاککەرەوەی کەفی نەرم'],['A soft daily cleanser that removes dirt and makeup without drying your skin.','غسول يومي ناعم يزيل الأوساخ والمكياج دون أن يجفف بشرتك.','پاککەرەوەیەکی ڕۆژانەی نەرم کە پیسی و ئارایش لادەبات بەبێ ئەوەی پێستت وشک بکات.'],
['Hydrating Hyaluronic Serum','سيروم الهيالورونيك المرطّب','سیرۆمی هایالورۆنیکی شێدارکەر'],['Lightweight serum that plumps and hydrates for all-day comfort.','سيروم خفيف يمنح البشرة امتلاءً وترطيباً مريحاً طوال اليوم.','سیرۆمێکی سووک کە پێست پڕ دەکات و بە درێژایی ڕۆژ شێداری دەکات.'],
['Vitamin C Brightening Serum','سيروم فيتامين C للإشراق','سیرۆمی ڤیتامین C بۆ درەوشانەوە'],['Evens skin tone and boosts radiance with stable vitamin C.','يوحّد لون البشرة ويعزز الإشراق بفيتامين C مستقر.','ڕەنگی پێست یەکسان دەکات و بە ڤیتامین C ی جێگیر درەوشانەوە زیاد دەکات.'],
['Daily Barrier Moisturizer','مرطّب الحاجز اليومي','شێدارکەری ڕۆژانەی پارێزەری پێست'],['Rich yet non-greasy cream that protects and restores your skin barrier.','كريم غني وغير دهني يحمي حاجز البشرة ويعيد ترميمه.','کرێمێکی دەوڵەمەند و نەچەورە کە پارێزەری پێستت دەپارێزێت و چاک دەکاتەوە.'],
['Mineral SPF 50 Sunscreen','واقي شمس معدني SPF 50','پاراستنی کانزایی لە هەتاو SPF 50'],['Broad-spectrum protection with a sheer, comfortable finish.','حماية واسعة الطيف بملمس خفيف ومريح.','پاراستنێکی فراوان بە هەستێکی سووک و ئاسوودە.'],
['Overnight Repair Cream','كريم الإصلاح الليلي','کرێمی چاککردنەوەی شەوانە'],['Nourishes while you sleep for softer, smoother skin by morning.','يغذّي بشرتك أثناء نومك لتصحو على بشرة أنعم وأكثر سلاسة.','لە کاتی خەوتندا پێستت خۆراک دەدات تا بەیانی نەرمتر و لووستر بێت.']];
W.push(['Color code','كود اللون',''],['Shipping','التوصيل',''],['Free','مجاني',''],['Free shipping','توصيل مجاني',''],['Payment method','طريقة الدفع',''],['Add this product to your bag?','هل تريد إضافة هذا المنتج إلى سلتك؟',''],['Yes, add','نعم، أضف',''],['No','لا',''],['Confirm order','تأكيد الطلب',''],['Confirming your order in','سيتم تأكيد طلبك خلال',''],['seconds','ثوانٍ',''],['Skip and confirm now','تخطي وتأكيد الآن',''],['Cancel order','إلغاء الطلب',''],['Order received','تم استلام الطلب',''],['Order confirmed','تم تأكيد الطلب',''],['Order shipped','تم شحن الطلب',''],['On its way to you','الطلب في طريقه إليك',''],['Order delivered','تم توصيل الطلب',''],['You can cancel your order for','يمكنك إلغاء الطلب خلال',''],['Cancel this order?','هل تريد إلغاء هذا الطلب؟',''],['Your order has been cancelled.','تم إلغاء طلبك.',''],['Cancellation window ended.','انتهت مهلة الإلغاء (10 دقائق).','']);
const LANGS={en:{dir:'ltr',h:'en'},ar:{dir:'rtl',h:'ar'}};
const L={ar:{},ku:{}};W.forEach(([e,a,k])=>{L.ar[e]=a;L.ku[e]=k});
/*GLS*/
const GLS=`cleanser|غسول|پاککەرەوە|n
face wash|غسول الوجه|شۆری ڕووخسار|n
serum|سيروم|سیرۆم|n
moisturizer|مرطّب|شێدارکەر|n
moisturiser|مرطّب|شێدارکەر|n
cream|كريم|کرێم|n
gel|جل|جێل|n
lotion|لوشن|لۆشن|n
toner|تونر|تۆنەر|n
mask|ماسك|ماسک|n
sunscreen|واقي شمس|پارێزەری هەتاو|n
sun care|العناية من الشمس|چاودێری لە هەتاو|n
oil|زيت|ڕۆن|n
mist|بخاخ|سپرەی|n
scrub|مقشّر|سکراب|n
exfoliator|مقشّر|سکراب|n
eye cream|كريم العين|کرێمی چاو|n
lip balm|بلسم الشفاه|بەلسەمی لێو|n
lipstick|أحمر شفاه|ڕووژی لێو|n
lip gloss|ملمّع شفاه|گلۆسی لێو|n
mascara|ماسكارا|ماسکارا|n
foundation|كريم أساس|فاونديشن|n
concealer|كونسيلر|کۆنسیلەر|n
blush|أحمر خدود|سوورەی ڕومەت|n
powder|بودرة|پودرە|n
primer|برايمر|پرایمەر|n
eyeliner|محدد العيون|ئایلاینەر|n
eyeshadow|ظلال العيون|سێبەری چاو|n
highlighter|هايلايتر|هایلایتەر|n
perfume|عطر|بۆن|n
shampoo|شامبو|شامپۆ|n
conditioner|بلسم الشعر|کەندیشنەر|n
soap|صابون|سابوون|n
set|طقم|سێت|n
kit|طقم|کیت|n
palette|باليت|پاڵێت|n
brush|فرشاة|فرچە|n
bag|حقيبة|جانتا|n
vitamin c|فيتامين سي|ڤیتامین سی|n
vitamin|فيتامين|ڤیتامین|n
hyaluronic acid|حمض الهيالورونيك|ترشی هایالورۆنیک|n
hyaluronic|هيالورونيك|هایالورۆنیک|a
niacinamide|نياسيناميد|نایاسیناماید|n
retinol|ريتينول|ڕێتینۆڵ|n
collagen|كولاجين|کۆلاجین|n
aloe vera|ألوفيرا|ئەلۆڤێرا|n
aloe|ألوفيرا|ئەلۆڤێرا|n
rose|ورد|گوڵ|n
green tea|شاي أخضر|چایی سەوز|n
argan|أرغان|ئارگان|n
coconut|جوز الهند|نارگیل|n
honey|عسل|هەنگوین|n
charcoal|فحم|خەڵوز|n
salicylic acid|حمض الساليسيليك|ترشی ساڵیسیلیک|n
skin|البشرة|پێست|n
face|الوجه|ڕووخسار|n
eye|العين|چاو|n
eyes|العيون|چاو|n
lip|الشفاه|لێو|n
lips|الشفاه|لێو|n
body|الجسم|جەستە|n
hair|الشعر|قژ|n
hand|اليد|دەست|n
glow|إشراقة|درەوشانەوە|n
volume|كثافة|زۆرکردن|n
lash|الرموش|برژانگ|n
lashes|الرموش|برژانگ|n
care|عناية|چاودێری|n
collection|مجموعة|کۆمەڵە|n
gentle|لطيف|نەرم|a
foaming|رغوي|کەفی|a
hydrating|مرطّب|شێدارکەر|a
brightening|مفتّح|ڕووناککەرەوە|a
soothing|مهدّئ|ئارامکەرەوە|a
nourishing|مغذّي|خۆراکدەر|a
repairing|مرمّم|چاککەرەوە|a
anti-aging|مضاد للتجاعيد|دژە پیری|a
oil-free|خالٍ من الزيوت|بێ ڕۆن|a
sensitive|حساس|هەستیار|a
dry|جاف|وشک|a
oily|دهني|ڕۆناوی|a
normal|عادي|ئاسایی|a
daily|يومي|ڕۆژانە|a
night|ليلي|شەوانە|a
matte|مات|مات|a
glossy|لامع|درەوشاوە|a
velvet|مخملي|مەخمەلی|a
soft|ناعم|نەرم|a
smooth|ناعم|نەرم|a
long-wearing|يدوم طويلاً|بەردەوام|a
long-lasting|يدوم طويلاً|بەردەوام|a
lightweight|خفيف|سووک|a
waterproof|مقاوم للماء|ئاوبەرگر|a
natural|طبيعي|سروشتی|a
radiant|مشرق|درەوشاوە|a
new|جديد|نوێ|a
premium|فاخر|پریمیەم|a
classic|كلاسيكي|کلاسیک|a
essential|أساسي|بنەڕەتی|a
pure|نقي|پاک|a
fresh|منعش|تازە|a
rich|غني|تێر|a
deep|عميق|قووڵ|a
intense|مركّز|چڕ|a
mini|صغير|بچووک|a
red|أحمر|سوور|a
pink|وردي|پەمەیی|a
nude|نيود|نیود|a
brown|بني|قاوەیی|a
black|أسود|ڕەش|a
white|أبيض|سپی|a
peach|خوخي|شەفتالوویی|a
coral|مرجاني|مەرجانی|a
and|و~|و|x
for|لـ~|بۆ|x
with|مع|لەگەڵ|x
in|في|لە|x
to|إلى|بۆ|x
all|كل|هەموو|x
every|كل|هەموو|x
types|أنواع|جۆرەکان|x
type|نوع|جۆر|x
the|||x
a|||x
an|||x
of|||x`,GM={},GC=new Map();GLS.split('\n').forEach(l=>{const[a,b,c,t]=l.split('|');if(a)GM[a]=[b,c,t||'n']});
let _gs='',_gu={};const gu=()=>{if(_gs!==(S.gl||'')){_gs=S.gl||'';_gu={};GC.clear();_gs.split('\n').forEach(l=>{const[a,b,c]=l.split('|').map(x=>x.trim());if(a&&(b||c))_gu[a.toLowerCase()]=[b||'',c||b||'','n']})}return _gu};
const gget=w=>{const u=gu();for(const x of[w,w.endsWith('es')&&w.slice(0,-2),w.endsWith('s')&&w.slice(0,-1)])if(x&&(u[x]||GM[x]))return u[x]||GM[x];return null};
function auto_(l,t){const ix=l=='ar'?0:1;let known=0,unk=0,real=0;const out=t.split(/([,.;:!?()\/]+|\s+-\s+)/).map(seg=>{if(/^([,.;:!?()\/]+|\s+-\s+)$/.test(seg))return seg.replace(/,/g,'،').replace(/\?/g,'؟');const ws=seg.trim().split(/\s+/).filter(Boolean);if(!ws.length)return seg;const items=[];for(let i=0;i<ws.length;){let hit=null,n=0;for(let k=Math.min(3,ws.length-i);k>=1;k--){const g=gget(ws.slice(i,i+k).join(' ').toLowerCase().replace(/[^a-z0-9' -]/g,''));if(g){hit=g;n=k;break}}if(hit){items.push({s:hit[ix]||hit[0],y:hit[2]});known++;real++;i+=n}else{const w=ws[i];if(/[0-9]/.test(w)||/^[A-Z]{2,}$/.test(w)||!/[A-Za-z]/.test(w)){const q=items[items.length-1];if(q&&q.y=='k')q.s+=' '+w;else items.push({s:w,y:'k'});known++}else{items.push({s:w,y:'u'});unk++}i++}}
const res=[];let run=[];const fl=()=>{res.push(...run.reverse());run=[]};items.forEach(it=>{if(it.y=='n'||it.y=='a'||it.y=='k')run.push(it);else{fl();res.push(it)}});fl();let tx_='';res.forEach(it=>{if(!it.s)return;tx_+=(tx_&&!tx_.endsWith('~')?' ':'')+it.s});return seg.match(/^\s*/)[0]+tx_.replace(/~/g,'')+seg.match(/\s*$/)[0]}).join('');return!real||unk/(known+unk)>0.2||out===t?'':out}
function auto(l,t,f){if(l=='en'||(!f&&S.at===0)||!/[A-Za-z]/.test(t)||t.length>220)return'';gu();const k=l+'|'+t;if(GC.has(k))return GC.get(k);let o='';try{o=auto_(l,t)}catch(e){}GC.set(k,o);return o}
/*GLE*/
const hv=(o,k)=>o&&Object.prototype.hasOwnProperty.call(o,k)&&o[k]?o[k]:'',lk=(l,k)=>hv(S.tr&&S.tr[l],k)||hv(L[l],k);
const dl=()=>{const d=S.dlg||'ar';if(LANGS[d])return d;const n=(navigator.language||'en').toLowerCase();return/^ar/.test(n)?'ar':'en'};
let lang='';try{lang=localStorage.lg2||''}catch(e){}if(!LANGS[lang])lang=dl();
const tx=k=>lang=='en'?k:(lk(lang,k)||auto(lang,k)||k);
function tn(n){const p=n.parentElement;if(!p||p.closest('#ad,.lg,#lsw,script,style'))return;const o=n._o??=n.nodeValue,k=o.trim();if(!k)return;const v=lang=='en'?'':(lk(lang,k)||auto(lang,k)),nv=v?o.replace(k,()=>v):o;if(n.nodeValue!==nv)n.nodeValue=nv}
function tr(r){if(r.nodeType==3)return tn(r);if(r.nodeType!=1)return;const w=document.createTreeWalker(r,4);let n;while(n=w.nextNode())tn(n);[r,...r.querySelectorAll('[placeholder],[aria-label],[title]')].forEach(e=>{if(e.closest('#ad,.lg,#lsw'))return;['placeholder','aria-label','title'].forEach(a=>{if(!e.hasAttribute(a))return;const o=e['_'+a]??=e.getAttribute(a),v=lang=='en'?'':lk(lang,o);e.setAttribute(a,v||o)})})}
new MutationObserver(m=>m.forEach(x=>x.addedNodes.forEach(tr))).observe(document.body,{childList:true,subtree:true});
function setLang(l){if(!LANGS[l])l='en';lang=l;const h=document.documentElement,c=LANGS[l];h.lang=c.h;h.dir=c.dir;$('#lsw').value=l;render();rc();tr(document.body)}
