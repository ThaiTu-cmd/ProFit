# Pull Workflow - Huong dan pull code an toan tu origin/develop

## 1. Truoc khi pull

Dam bao ban dang o branch `develop`:
```powershell
cd C:\Users\Admin\Desktop\ProFit-springboot
git status
```
Neu khong phai `develop`:
```powershell
git checkout develop
```

## 2. Pull su dung script an toan

Chay script `pull-safe.ps1` (tu thu muc goc cua repo):
```powershell
.\pull-safe.ps1
```

Script se tu dong:
- **Backup code local** ra `_backups/code_before_pull_<timestamp>.zip`
- **Backup MySQL DB** ra `_backups/db_before_pull_<timestamp>.sql` (neu container dang chay)
- **Stash** cac thay doi local chua commit
- **Fetch + pull** tu `origin/develop`
- **Pop stash** lai neu pull thanh cong

## 3. Xu ly CONFLICT (neu co)

Khi 2 nguoi sua cung 1 file, git se khong tu giai quyet duoc.

### Buoc 1: xem danh sach file conflict
```powershell
git status
```
File bi conflict se co status `both modified`.

### Buoc 2: xem chi tiet conflict trong 1 file
```powershell
git diff <file>
```
Ban se thay cac marker:
```
<<<<<<< HEAD
(code cua ban)
=======
(code moi tu origin/develop)
>>>>>>> origin/develop
```

### Buoc 3: chon giai phap

Co 3 lua chon cho moi doan conflict:

**a) Giu code cua ban** (HEAD):
- Xoa phan `<<<<<<< HEAD` den `=======`
- Giu lai phan cua ban

**b) Giu code moi** (origin/develop):
- Xoa phan `<<<<<<< HEAD` den `=======`
- Giu lai phan moi

**c) Gop ca 2** (thuong can nhat):
- Giu ca 2 phan, sua lai cho hop ly

**d) Huy pull, quay lai trang thai truoc:**
```powershell
git merge --abort
git stash pop   # lay lai thay doi local
```

### Buoc 4: commit sau khi fix
```powershell
git add <file>
git commit -m "merge: giai quyet conflict voi code moi"
```

## 4. Thay doi local ma ban KHONG muon push

Neu ban dang sua code nhung chua muon push (vd: thu nghiem ChatWidget moi):
```powershell
# Luu tam thoi
git stash push -u -m "mo-ta-thay-doi"

# Khoi phuc lai
git stash pop

# Xem danh sach stash
git stash list
```

## 5. Khi nao KHONG nen pull

- Dang o giua 1 task dang lam doi, chua commit -> hay commit hoac stash truoc
- DB dang co data test quan trong chua backup -> chay pull-safe.ps1 (no tu backup)
- Dang debug 1 loi, can code o trang thai on dinh -> khong pull luc do

## 6. Quy tac tranh conflict

1. **Moi nguoi lam viec tren nhanh rieng** (khong sua truc tiep develop)
2. **Commit nho, commit nhieu** (de git merge de hon)
3. **Truoc khi push**, pull develop ve truoc de merge som
4. **Truoc khi pull**, dam bao local clean (commit hoac stash het)
5. **Khi sua cung 1 file** (vd `ChatWidget.jsx`), bao team de chia vung

## 7. Rollback neu pull gay loi

Pull-safe.ps1 luu backup. De khoi phuc:
```powershell
# Xem backup
dir _backups\

# Khoi phuc code (giai nen ra 1 folder khac, so sanh)
Expand-Archive _backups\code_before_pull_<timestamp>.zip -DestinationPath _backups\restore_<timestamp>\

# Khoi phuc DB (neu can)
docker exec -i profit-mysql mysql -uroot -proot ProFitSuppsDB < _backups\db_before_pull_<timestamp>.sql
```

## 8. Git config da setup san

File `.git/config` da duoc set:
- `core.autocrlf = true` (xu ly CRLF/LF tu dong tren Windows)
- `rerere.enabled = true` (git nho cach giai quyet conflict da lam)
- `pull.ff = only` (chi pull khi co the fast-forward, an toan hon)
- `merge.ff = only` (chi merge khi co the fast-forward)

Cac config nay chi ap dung cho repo nay, khong anh huong may khac.
