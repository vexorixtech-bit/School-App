import bcrypt, psycopg2
pw = bcrypt.hashpw('arun123'.encode(), bcrypt.gensalt()).decode()
conn = psycopg2.connect('postgresql://postgres:Vignesh%401620@localhost:5432/school_erp')
cur = conn.cursor()
cur.execute("UPDATE users SET password_hash = %s WHERE id = 7", (pw,))
conn.commit()
cur.close()
conn.close()
print('Password updated for arun.1 -> arun123')
