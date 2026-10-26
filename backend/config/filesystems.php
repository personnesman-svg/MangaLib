<?php

return [
    'default' => env('FILESYSTEM_DISK', 'public'),
    'disks' => [
        'local' => [
            'driver' => 'local',
            'root' => storage_path('app/private'),
            'serve' => true,
            'throw' => true,
        ],
        'public' => [
            'driver' => 'gridfs',
            'connection' => 'mongodb',
            'bucket' => env('MONGODB_FILES_BUCKET', 'manga_files'),
            'visibility' => 'public',
            'throw' => true,
            'report' => true,
        ],
    ],
    'links' => [],
];
