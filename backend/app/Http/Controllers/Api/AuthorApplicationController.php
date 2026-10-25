<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuthorApplication;
use Illuminate\Http\Request;

class AuthorApplicationController extends Controller
{
    public function show(Request $request)
    {
        $user = $request->user();
        $application = $user->authorApplications()->latest()->first();

        return response()->json(['data' => $application ? $this->applicationData($application) : null]);
    }

    public function store(Request $request)
    {
        abort_if($request->user()->role !== 'user', 403, 'Only regular accounts can apply to become an author.');
        abort_if($request->user()->authorApplications()->where('status', 'pending')->exists(), 409, 'У тебя уже есть заявка на рассмотрении.');

        $data = $request->validate([
            'pen_name' => ['required', 'string', 'min:2', 'max:120'],
            'portfolio_url' => ['nullable', 'url', 'max:2048'],
            'social_links' => ['nullable', 'string', 'max:4000'],
            'motivation' => ['required', 'string', 'min:30', 'max:5000'],
        ]);

        $application = $request->user()->authorApplications()->create([
            ...$data,
            'status' => 'pending',
        ]);

        return response()->json(['data' => $this->applicationData($application)], 201);
    }

    private function applicationData(AuthorApplication $application): array
    {
        return [
            'id' => $application->id,
            'pen_name' => $application->pen_name,
            'portfolio_url' => $application->portfolio_url,
            'social_links' => $application->social_links,
            'motivation' => $application->motivation,
            'status' => $application->status,
            'admin_note' => $application->admin_note,
            'reviewed_at' => $application->reviewed_at?->toISOString(),
            'created_at' => $application->created_at?->toISOString(),
        ];
    }
}
