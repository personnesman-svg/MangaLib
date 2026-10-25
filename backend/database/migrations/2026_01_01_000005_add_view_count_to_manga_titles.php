<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void { Schema::table('manga_titles', fn (Blueprint $table) => $table->unsignedBigInteger('view_count')->default(0)->index()); }
    public function down(): void { Schema::table('manga_titles', fn (Blueprint $table) => $table->dropColumn('view_count')); }
};
