FROM composer:2 AS laravel-build
WORKDIR /build
RUN composer create-project laravel/laravel:^12.0 . --no-interaction --prefer-dist \
    && php artisan install:api --without-migration-prompt \
    && if ! grep -R "Schema::create('sessions'" database/migrations >/dev/null 2>&1; then php artisan session:table; fi \
    && rm -f .env
COPY app/ /build/app/
COPY bootstrap/app.php /build/bootstrap/app.php
COPY routes/api.php /build/routes/api.php
COPY routes/web.php /build/routes/web.php
COPY routes/console.php /build/routes/console.php
COPY database/migrations/ /build/database/migrations/
RUN composer install --no-dev --no-interaction --prefer-dist --optimize-autoloader

FROM php:8.4-fpm-alpine
RUN apk add --no-cache icu-dev libzip-dev oniguruma-dev libxml2-dev curl-dev \
    && docker-php-ext-install pdo_mysql mbstring intl zip bcmath opcache xml curl fileinfo exif \
    && printf '%s\n' 'upload_max_filesize=16M' 'post_max_size=512M' 'max_file_uploads=501' 'max_execution_time=300' 'memory_limit=512M' > /usr/local/etc/php/conf.d/manga.ini \
    && printf '%s\n' '[www]' 'request_terminate_timeout=300' > /usr/local/etc/php-fpm.d/zz-manga.conf
WORKDIR /var/www/html
COPY --from=laravel-build /build/ /var/www/html/
RUN mkdir -p storage/app/public bootstrap/cache \
    && chown -R www-data:www-data storage bootstrap/cache
EXPOSE 9000
CMD ["php-fpm", "-F"]
