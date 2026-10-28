// NODE_ENV is typed read-only under Next's ambient types; assign through the index signature.
;(process.env as Record<string, string>).NODE_ENV = 'test'
