<?php

namespace App\Models;

if (env('DB_CONNECTION', 'mongodb') === 'mysql' || env('DB_CONNECTION', 'mongodb') === 'sqlite') {
    abstract class BaseAuthenticatable extends \Illuminate\Foundation\Auth\User
    {
    }
} else {
    abstract class BaseAuthenticatable extends \MongoDB\Laravel\Auth\User
    {
        protected $connection = 'mongodb';
        protected $keyType = 'string';
        public $incrementing = false;
    }
}
