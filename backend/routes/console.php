<?php

use Illuminate\Support\Facades\Artisan;

Artisan::command('manga:about', function () {
    $this->info('Manga Platform API');
});
