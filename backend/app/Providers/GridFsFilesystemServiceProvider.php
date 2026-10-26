<?php

namespace App\Providers;

use Illuminate\Filesystem\FilesystemAdapter as LaravelFilesystemAdapter;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\ServiceProvider;
use League\Flysystem\Filesystem;
use League\Flysystem\GridFS\GridFSAdapter;
use MongoDB\Client;

class GridFsFilesystemServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        Storage::extend('gridfs', function ($app, array $config) {
            $connection = config('database.connections.' . ($config['connection'] ?? 'mongodb'));
            $dsn = $connection['dsn'] ?? env('MONGODB_URI');

            if (!$dsn) {
                throw new \RuntimeException('MONGODB_URI is required for the GridFS storage disk.');
            }

            $client = new Client($dsn);
            $database = $client->selectDatabase($connection['database'] ?? env('MONGODB_DATABASE', 'mangalib'));
            $bucket = $database->selectGridFSBucket(['bucketName' => $config['bucket'] ?? 'manga_files']);
            $adapter = new GridFSAdapter($bucket);
            $filesystem = new Filesystem($adapter, ['visibility' => $config['visibility'] ?? 'public']);

            return new LaravelFilesystemAdapter($filesystem, $adapter, $config);
        });
    }
}
