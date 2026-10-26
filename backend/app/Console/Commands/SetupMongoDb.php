<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use MongoDB\Client;

class SetupMongoDb extends Command
{
    protected $signature = 'manga:mongodb-setup';
    protected $description = 'Create the MongoDB indexes required by MangaLib';

    public function handle(): int
    {
        $uri = (string) config('database.connections.mongodb.dsn');
        $databaseName = (string) config('database.connections.mongodb.database');

        if ($uri === '' || $databaseName === '') {
            $this->error('MONGODB_URI and MONGODB_DATABASE must be configured.');
            return self::FAILURE;
        }

        $database = (new Client($uri))->selectDatabase($databaseName);
        $indexes = [
            'users' => [
                [['email' => 1], ['unique' => true, 'name' => 'users_email_unique']],
            ],
            'manga_titles' => [
                [['slug' => 1], ['unique' => true, 'name' => 'manga_titles_slug_unique']],
                [['is_published' => 1, 'updated_at' => -1], ['name' => 'titles_published_updated']],
            ],
            'genres' => [
                [['slug' => 1], ['unique' => true, 'name' => 'genres_slug_unique']],
            ],
            'manga_chapters' => [
                [['manga_title_id' => 1, 'number' => 1], ['unique' => true, 'name' => 'chapters_title_number_unique']],
                [['manga_title_id' => 1, 'is_published' => 1, 'number' => 1], ['name' => 'chapters_title_published_number']],
            ],
            'chapter_pages' => [
                [['manga_chapter_id' => 1, 'page_number' => 1], ['unique' => true, 'name' => 'pages_chapter_number_unique']],
            ],
            'reading_progress' => [
                [['user_id' => 1, 'manga_title_id' => 1], ['unique' => true, 'name' => 'progress_user_title_unique']],
            ],
            'author_applications' => [
                [['user_id' => 1, 'created_at' => -1], ['name' => 'applications_user_created']],
                [['status' => 1, 'created_at' => -1], ['name' => 'applications_status_created']],
            ],
            'comments' => [
                [['manga_title_id' => 1, 'created_at' => -1], ['name' => 'comments_title_created']],
            ],
        ];

        foreach ($indexes as $collectionName => $definitions) {
            $collection = $database->selectCollection($collectionName);
            foreach ($definitions as [$keys, $options]) {
                $collection->createIndex($keys, $options);
            }
        }

        $this->info('MangaLib MongoDB indexes are ready.');
        return self::SUCCESS;
    }
}
