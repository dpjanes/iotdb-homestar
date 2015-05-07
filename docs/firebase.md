Firebase Structure

    users
        [user_id] (access control here)
            runners
                [runner_id]
                    things
                        [things...]
                    users (only if owner)
                        [users...] (for this runner)
    
    runners
        [runnerid]
            things
                [user_id]
                    [things...]
            users
                [users...]
            
