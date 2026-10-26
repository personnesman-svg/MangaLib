<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuthorApplication;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class AdminAuthorApplicationController extends Controller
{
    public function index(Request $request)
    {
        $status = $request->query('status', 'pending');
        abort_unless(in_array($status, ['pending', 'approved', 'rejected', 'all'], true), 422, 'Invalid application status.');

        $query = AuthorApplication::query()->with(['user:id,name,email', 'reviewer:id,name']);
        if (in_array(env('DB_CONNECTION', 'mongodb'), ['mysql', 'sqlite'], true)) {
            $query->orderByRaw("CASE WHEN status = 'pending' THEN 0 ELSE 1 END");
        } else {
            $query->orderBy('status');
        }
        $query->latest();
        if ($status !== 'all') $query->where('status', $status);

        $perPage = min(max((int) $request->query('per_page', 30), 1), 100);
        $applications = $query->paginate($perPage)->through(fn (AuthorApplication $application) => [
            'id' => $application->id,
            'user_id' => $application->user_id,
            'user_name' => $application->user?->name,
            'user_email' => $application->user?->email,
            'pen_name' => $application->pen_name,
            'portfolio_url' => $application->portfolio_url,
            'social_links' => $application->social_links,
            'motivation' => $application->motivation,
            'status' => $application->status,
            'admin_note' => $application->admin_note,
            'reviewer_name' => $application->reviewer?->name,
            'reviewed_at' => $application->reviewed_at?->toISOString(),
            'created_at' => $application->created_at?->toISOString(),
        ]);

        return response()->json($applications);
    }

    public function review(Request $request, AuthorApplication $application)
    {
        $data = $request->validate([
            'status' => ['required', Rule::in(['approved', 'rejected'])],
            'admin_note' => ['nullable', 'string', 'max:5000'],
        ]);
        abort_unless($application->status === 'pending', 409, 'Эта заявка уже рассмотрена.');

        DB::transaction(function () use ($request, $application, $data) {
            $application->update([
                'status' => $data['status'],
                'admin_note' => $data['admin_note'] ?? null,
                'reviewed_by' => $request->user()->id,
                'reviewed_at' => now(),
            ]);

            if ($data['status'] === 'approved') {
                $application->user()->update(['role' => 'author']);
            }
        });

        return response()->json(['data' => ['id' => $application->id, 'status' => $application->fresh()->status]]);
    }
}
