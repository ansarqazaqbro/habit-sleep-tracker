<?php

namespace App\Policies;

use App\Models\SleepLog;
use App\Models\User;

class SleepLogPolicy
{
    public function view(User $user, SleepLog $sleepLog): bool
    {
        return $this->owns($user, $sleepLog);
    }

    public function update(User $user, SleepLog $sleepLog): bool
    {
        return $this->owns($user, $sleepLog);
    }

    public function delete(User $user, SleepLog $sleepLog): bool
    {
        return $this->owns($user, $sleepLog);
    }

    private function owns(User $user, SleepLog $sleepLog): bool
    {
        return $sleepLog->user_id === $user->id;
    }
}
