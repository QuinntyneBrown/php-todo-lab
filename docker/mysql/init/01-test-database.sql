-- The Pest feature suite runs against its own database so it never touches dev data.
CREATE DATABASE IF NOT EXISTS todo_test CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
GRANT ALL PRIVILEGES ON todo_test.* TO 'todo'@'%';
