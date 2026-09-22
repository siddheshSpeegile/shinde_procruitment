# import MySQLdb
# from MySQLdb import cursors
# from config import config

# class Database:
#     """Database connection manager"""
    
#     def __init__(self):
#         self.connection = None
    
#     def connect(self):
#         """Establish database connection"""
#         try:
#             self.connection = MySQLdb.connect(
#                 host=config.DB_HOST,
#                 user=config.DB_USER,
#                 password=config.DB_PASSWORD,
#                 database=config.DB_NAME,
#                 port=config.DB_PORT,
#                 cursorclass=cursors.DictCursor,
#                 charset='utf8mb4'
#             )
#             return self.connection
#         except MySQLdb.Error as e:
#             print(f"Database connection error: {e}")
#             return None
    
#     def close(self):
#         """Close database connection"""
#         if self.connection:
#             self.connection.close()
    
#     def execute_query(self, query, params=None):
#         """Execute SELECT query and return results"""
#         cursor = None
#         try:
#             cursor = self.connection.cursor()
#             if params:
#                 cursor.execute(query, params)
#             else:
#                 cursor.execute(query)
#             return cursor.fetchall()
#         except MySQLdb.Error as e:
#             print(f"Query execution error: {e}")
#             return None
#         finally:
#             if cursor:
#                 cursor.close()
    
#     def execute_insert(self, query, params=None):
#         """Execute INSERT query and return inserted ID"""
#         cursor = None
#         try:
#             cursor = self.connection.cursor()
#             if params:
#                 cursor.execute(query, params)
#             else:
#                 cursor.execute(query)
#             self.connection.commit()
#             return cursor.lastrowid
#         except MySQLdb.Error as e:
#             self.connection.rollback()
#             print(f"Insert error: {e}")
#             return None
#         finally:
#             if cursor:
#                 cursor.close()
    
#     def execute_update(self, query, params=None):
#         """Execute UPDATE or DELETE query"""
#         cursor = None
#         try:
#             cursor = self.connection.cursor()
#             if params:
#                 cursor.execute(query, params)
#             else:
#                 cursor.execute(query)
#             self.connection.commit()
#             return cursor.rowcount
#         except MySQLdb.Error as e:
#             self.connection.rollback()
#             print(f"Update error: {e}")
#             return 0
#         finally:
#             if cursor:
#                 cursor.close()
    
#     def execute_transaction(self, queries):
#         """Execute multiple queries as a transaction"""
#         cursor = None
#         try:
#             cursor = self.connection.cursor()
#             for query, params in queries:
#                 if params:
#                     cursor.execute(query, params)
#                 else:
#                     cursor.execute(query)
#             self.connection.commit()
#             return True
#         except MySQLdb.Error as e:
#             self.connection.rollback()
#             print(f"Transaction error: {e}")
#             return False
#         finally:
#             if cursor:
#                 cursor.close()

# # Global database instance
# db = Database()

import threading
import psycopg2
import psycopg2.extras
from config import config

class Database:
    """Database connection manager.

    IMPORTANT: `db` below is a single global instance shared by every
    request. The connection itself must NOT be a plain instance
    attribute (self.connection = ...), because Flask's dev server
    handles requests on multiple threads - two requests arriving at
    almost the same moment would both write to the same
    self.connection slot and stomp on each other mid-query, causing
    "cursor already closed" / "connection already closed" crashes
    exactly like the ones seen when the Vendor Workspace screen fired
    three API calls close together.

    Fix: store the connection in thread-local storage instead. Each
    thread (i.e. each request, since before_request/teardown_request
    in app.py already connect/close per request) gets its own
    independent connection slot that no other thread can see or
    overwrite, while every method below keeps working exactly as
    before - self.connection now just resolves per-thread instead of
    globally.
    """

    def __init__(self):
        self._local = threading.local()

    @property
    def connection(self):
        return getattr(self._local, 'connection', None)

    @connection.setter
    def connection(self, value):
        self._local.connection = value

    def connect(self):
        """Establish a database connection for the CURRENT thread/request"""
        try:
            self.connection = psycopg2.connect(
                host=config.DB_HOST,
                user=config.DB_USER,
                password=config.DB_PASSWORD,
                dbname=config.DB_NAME,
                port=config.DB_PORT,
                cursor_factory=psycopg2.extras.RealDictCursor,
                # Every query in this codebase is unqualified (FROM vendor,
                # FROM "User", etc.), which Postgres normally resolves in
                # the 'public' schema. If your tables actually live in a
                # different schema (e.g. DB_SCHEMA=shinde_procurement
                # because that was created as a schema rather than a
                # separate database), this makes the connection look there
                # first - falling back to public for anything not found,
                # so nothing breaks for the default public-schema case.
                options=f'-c search_path={config.DB_SCHEMA},public'
            )
            return self.connection
        except psycopg2.Error as e:
            print(f"Database connection error: {e}")
            return None
    
    def close(self):
        """Close the CURRENT thread/request's database connection"""
        if self.connection:
            self.connection.close()
            self.connection = None
    
    def execute_query(self, query, params=None):
        """Execute SELECT query and return results"""
        cursor = None
        try:
            cursor = self.connection.cursor()
            if params:
                cursor.execute(query, params)
            else:
                cursor.execute(query)
            return cursor.fetchall()
        except psycopg2.Error as e:
            print(f"Query execution error: {e}")
            # IMPORTANT: roll back so this failed query doesn't leave the
            # connection in an aborted-transaction state, which would cause
            # every subsequent query on this connection to fail too.
            if self.connection:
                self.connection.rollback()
            return None
        finally:
            if cursor:
                cursor.close()
    
    def execute_insert(self, query, params=None):
        """Execute INSERT query and return inserted ID.
        NOTE: query must end with RETURNING <some_id_column>"""
        cursor = None
        try:
            cursor = self.connection.cursor()
            if params:
                cursor.execute(query, params)
            else:
                cursor.execute(query)
            self.connection.commit()
            result = cursor.fetchone()
            # Grab the first returned value regardless of its column name
            # (RETURNING category_id, RETURNING product_id, etc. all work this way)
            return list(result.values())[0] if result else None
        except psycopg2.Error as e:
            self.connection.rollback()
            print(f"Insert error: {e}")
            return None
        finally:
            if cursor:
                cursor.close()
    
    def execute_update(self, query, params=None):
        """Execute UPDATE or DELETE query"""
        cursor = None
        try:
            cursor = self.connection.cursor()
            if params:
                cursor.execute(query, params)
            else:
                cursor.execute(query)
            self.connection.commit()
            return cursor.rowcount
        except psycopg2.Error as e:
            self.connection.rollback()
            print(f"Update error: {e}")
            return 0
        finally:
            if cursor:
                cursor.close()
    
    def execute_transaction(self, queries):
        """Execute multiple queries as a transaction"""
        cursor = None
        try:
            cursor = self.connection.cursor()
            for query, params in queries:
                if params:
                    cursor.execute(query, params)
                else:
                    cursor.execute(query)
            self.connection.commit()
            return True
        except psycopg2.Error as e:
            self.connection.rollback()
            print(f"Transaction error: {e}")
            return False
        finally:
            if cursor:
                cursor.close()

# Global database instance
db = Database()