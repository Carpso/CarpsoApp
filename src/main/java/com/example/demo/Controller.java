
    package com.example.demo;

    import org.springframework.web.bind.annotation.GetMapping;
    import org.springframework.web.bind.annotation.RestController;

    @RestController
    public class Controller {

        @GetMapping("/hello")
        public String hello() {
            return "Hello, world!";
        }

        @GetMapping("/newEndpoint")
        public String newEndpoint() {
            return "This is a new endpoint.";
        }
    }
    