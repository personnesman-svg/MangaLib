<?php

namespace App\Models;

/**
 * Keep local Docker Compose on SQL while using MongoDB in the Vercel container.
 */
if (env('DB_CONNECTION', 'mongodb') === 'mysql' || env('DB_CONNECTION', 'mongodb') === 'sqlite') {
    abstract class BaseModel extends \Illuminate\Database\Eloquent\Model
    {
    }
} else {
    abstract class BaseModel extends \MongoDB\Laravel\Eloquent\Model
    {
        protected $connection = 'mongodb';
        protected $keyType = 'string';
        public $incrementing = false;
    }
}
