<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('manga_titles', function (Blueprint $table) {
            $table->foreignId('owner_user_id')->nullable()->after('id')->constrained('users')->nullOnDelete();
            $table->string('review_status', 20)->default('draft')->index();
            $table->timestamp('first_published_at')->nullable()->index();
            $table->text('review_note')->nullable();
            $table->foreignId('reviewed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('reviewed_at')->nullable();
        });

        DB::table('manga_titles')->where('is_published', true)->update([
            'review_status' => 'approved',
            'first_published_at' => DB::raw('COALESCE(updated_at, created_at)'),
        ]);
    }

    public function down(): void
    {
        Schema::table('manga_titles', function (Blueprint $table) {
            $table->dropConstrainedForeignId('owner_user_id');
            $table->dropConstrainedForeignId('reviewed_by');
            $table->dropIndex(['review_status']);
            $table->dropIndex(['first_published_at']);
            $table->dropColumn(['review_status', 'review_note', 'reviewed_at', 'first_published_at']);
        });
    }
};
