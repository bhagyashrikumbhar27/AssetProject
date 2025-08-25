package com.greentin.assetApp.config;

import com.greentin.assetApp.service.CustomUserDetailsService;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;
import jakarta.servlet.http.HttpServletResponse;

@Configuration
@RequiredArgsConstructor
public class SecurityConfig {

    private final CustomUserDetailsService userDetailsService;

    @Bean
    public PasswordEncoder passwordEncoder() {
        // DelegatingPasswordEncoder with bcrypt as default
        var delegating = (org.springframework.security.crypto.password.DelegatingPasswordEncoder)
                org.springframework.security.crypto.factory.PasswordEncoderFactories.createDelegatingPasswordEncoder();
        // Fallback for legacy hashes without {id} prefix (e.g., older bcrypt hashes)
        delegating.setDefaultPasswordEncoderForMatches(new org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder());
        return delegating;
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }

    @Bean
    public DaoAuthenticationProvider authenticationProvider() {
        DaoAuthenticationProvider provider = new DaoAuthenticationProvider();
        provider.setUserDetailsService(userDetailsService);
        provider.setPasswordEncoder(passwordEncoder());
        return provider;
    }

    @Bean
    public JwtAuthFilter jwtAuthFilter() {
        return new JwtAuthFilter(userDetailsService);
    }

    @Bean
    @Order(1)
    public SecurityFilterChain errorFilterChain(HttpSecurity http) throws Exception {
        return http
                .securityMatcher("/error")
                .authorizeHttpRequests(auth -> auth.anyRequest().permitAll())
                .build();
    }

    @Bean
    @Order(2)
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                .csrf(csrf -> csrf.disable())
                .cors(cors -> {})
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(org.springframework.http.HttpMethod.OPTIONS, "/**").permitAll()
                        .requestMatchers("/api/auth/**", "/api/mail/**").permitAll()
                        .requestMatchers("/api/employee/**").hasAnyAuthority("ROLE_EMPLOYEE","ROLE_DEPARTMENT_ADMIN","ROLE_SUPER_ADMIN")
                        .requestMatchers("/api/department-admin/**").hasAnyAuthority("ROLE_DEPARTMENT_ADMIN","ROLE_SUPER_ADMIN")
                        .requestMatchers("/api/store-manager/**").permitAll()
                        .requestMatchers("/api/super-admin/**", "/api/superadmin/**").hasAuthority("ROLE_SUPER_ADMIN")
                        .anyRequest().authenticated()
                )
                .httpBasic(basic -> basic.disable())
                .formLogin(form -> form.disable())
                .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .exceptionHandling(ex -> ex
                        .authenticationEntryPoint((req, res, ex1) ->
                                res.sendError(HttpServletResponse.SC_UNAUTHORIZED, "Unauthorized"))
                )
                .addFilterBefore(jwtAuthFilter(), UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public WebMvcConfigurer corsConfigurer() {
        return new WebMvcConfigurer() {
            @Override
            public void addCorsMappings(CorsRegistry registry) {
                registry.addMapping("/**")
                        .allowedOrigins("http://localhost:4200")
                        .allowedMethods("*")
                        .allowedHeaders("*")
                        .allowCredentials(true);
            }
        };
    }
}
