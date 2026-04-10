package com.doan.ProFit.repository;

import com.doan.ProFit.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
	Optional<User> findByEmailOrPhone(String email, String phone);

	boolean existsByRoleAndDeletedAtIsNull(com.doan.ProFit.enums.Role role);
}
