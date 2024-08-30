<div align="center" style="font-family: Arial, sans-serif; color: #333;">
    <h2>ساخت لینک اشتراک و پنل مدیریت اشتراکها</h2>
</div>
1️⃣ ایجاد یک ورکر جدید در Cloudflare Workers:
ورود به حساب کاربری Cloudflare:

وارد حساب کاربری Cloudflare خود شوید. اگر حساب کاربری ندارید، ابتدا یک حساب کاربری رایگان بسازید.
ایجاد یک ورکر جدید:

به داشبورد Workers بروید.
بر روی Create a Service کلیک کنید.
نامی برای سرویس خود انتخاب کنید و HTTP Handler را به عنوان نوع ورکر انتخاب کنید.
ویرایش کد ورکر:

کد موجود در بخش Script را با کد زیر جایگزین کنید (کدی که به‌روز شده است).
سپس روی Save and Deploy کلیک کنید.
2️⃣ ایجاد یک فضای ذخیره‌سازی کلید/مقدار (KV) در Cloudflare:

به Workers KV در داشبورد Cloudflare بروید.
روی Create Namespace کلیک کنید و نامی برای فضای ذخیره‌سازی (Namespace) خود انتخاب کنید.

اتصال فضای ذخیره‌سازی KV به ورکر:

به بخش Settings از سرویس ورکر خود بروید.
به Variables بروید و در بخش KV Namespace Bindings روی Add Binding کلیک کنید.
نام بایندینگ را ( sub) انتخاب کنید و فضای ذخیره‌سازی که در مرحله قبل ایجاد کردید را انتخاب کنید.
3️⃣ تنظیمات و اجرای کد:

پس از ذخیره و دیپلوی ورکر، می‌توانید از آدرس URL اختصاصی ورکر خود برای دسترسی به صفحه مدیریت استفاده کنید.
در ابتدا از شما خواسته می‌شود یک رمز عبور جدید تنظیم کنید.
سپس می‌توانید وارد شوید و از امکانات مختلف مانند ایجاد محتوا، ویرایش و حذف محتوا استفاده کنید.
🎯 توضیحات کوتاه درباره قابلیت‌ها:

ایجاد محتوا: قابلیت ایجاد محتوای جدید با استفاده از UUID.
ویرایش و حذف محتوا: قابلیت ویرایش و حذف محتوای موجود.
تغییر رمز عبور: امکان تغییر رمز عبور از پنل مدیریت.

📌 نکات مهم:
Cloudflare KV: برای ذخیره‌سازی امن رمز عبور و محتوای شما استفاده می‌شود.
امنیت: حتماً رمز عبور قوی انتخاب کنید.

<p align="center">
    <img width="70%" src="https://github.com/3yed-61/warpsub/blob/1e9fa0df21d00878653e25cbdfc49421092d1496/images/b.gif" alt="Subscription Animation"/>
</p>

<p align="center">
    <img width="70%" src="https://github.com/user-attachments/assets/83f419cb-7ca6-4a39-8cf4-33709dfc0aa1" alt="Subscription Panel"/>
</p>

<p align="center">
    <img width="70%" src="https://github.com/3yed-61/warpsub/blob/1e9fa0df21d00878653e25cbdfc49421092d1496/images/p.gif" alt="Panel Animation"/>
</p>

<p align="center">
    <img width="70%" src="https://github.com/user-attachments/assets/49172c37-7554-4388-bca8-7a9f24552a0c" alt="Key Visual"/>
</p>
