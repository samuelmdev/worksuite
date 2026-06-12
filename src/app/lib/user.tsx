'use client'

import { useEffect, useState } from 'react'


type User = {
id: string
email: string
roles: string[] // e.g. ["admin"], ["manager"], ["employee"]
}


export function useUser(): User | null {
// Placeholder: pretend we are logged in as an employee for preview
const [user, setUser] = useState<User | null>(null)


useEffect(() => {
// toggle role here for testing
setUser({ id: '1', email: 'demo@example.com', roles: ['employee'] })
}, [])


return user
}