# CloudBSD Admin Web UI - User Manual

## Table of Contents
1. [Introduction](#introduction)
2. [Authentication](#authentication)
    - [Login](#login)
    - [Language Selection](#language-selection)
3. [Dashboard](#dashboard)
4. [Resource Management](#resource-management)
    - [Virtual Machines (bhyve)](#virtual-machines-bhyve)
    - [OCI Containers](#oci-containers)
    - [Jails](#jails)
5. [Cluster Management](#cluster-management)
6. [Network Map](#network-map)
7. [Administration](#administration)
    - [User Roles & Permissions](#user-roles-permissions)
    - [User Management](#user-management)
    - [System Logs](#system-logs)
    - [Settings](#settings)
8. [Troubleshooting](#troubleshooting)

---

## Introduction
CloudBSD Admin Web UI is a modern, responsive interface designed for managing infrastructure on FreeBSD and other CloudBSD-compatible systems. It provides a centralized dashboard for monitoring and controlling Virtual Machines (bhyve), OCI-compliant containers, and native FreeBSD Jails.

---

## Authentication

### Login
Access the UI at `http://localhost:3001` (or your configured port). 
- **Default Username**: `admin`
- **Default Password**: `admin`

*Note: It is highly recommended to change the admin password or create a new admin user immediately after first login.*

### Language Selection
On the login page, you can select your preferred language from a dropdown menu in the footer. CloudBSD Admin supports over 40 languages, ensuring accessibility for a global audience. Your language choice is persisted to your user profile once logged in.

---

## Dashboard
The Dashboard provides a real-time overview of your system's health, including:
- CPU and Memory usage.
- Status of running VMs, Containers, and Jails.
- Recent system alerts and activities.

---

## Resource Management

### Virtual Machines (bhyve)
Manage bhyve virtual machines with ease:
- **List**: View all configured VMs and their current states.
- **Control**: Start, stop, and restart VMs.
- **Terminal**: Access VM consoles directly from the web interface.

### OCI Containers
Monitor and manage OCI-compliant containers (Docker/Podman):
- View running containers and resource consumption.
- Perform basic lifecycle operations (start, stop).

### Jails
Manage native FreeBSD Jails:
- View all active and inactive Jails.
- Monitor resource isolation and jail-specific metrics.

---

## Cluster Management
The **Cluster** view allows you to manage multiple nodes within your CloudBSD infrastructure, providing a unified view of resource distribution and node health.

## Network Map
The **Network Map** provides a visual representation of your infrastructure's networking, including connections between hosts, VMs, and containers.

### User Roles & Permissions
CloudBSD Admin uses a role-based access control (RBAC) system to manage permissions:

- **Admin**: Full access to all features, including user management, audit logs, and system configuration.
- **Operator**: Can manage resources (VMs, Containers, Jails) and view system stats, but cannot manage users or view audit logs.
- **Viewer**: Read-only access to resources and system stats. Cannot perform any actions or modifications.

---

## Administration

### User Management
Under the **Users** section, administrators can:
- Create new users.
- Edit existing user profiles and roles.
- Delete users.
- Assign permissions (Admin, Operator, Read-only).

### System Logs
The **Logs** page provides a searchable audit trail of system activities, including login attempts, resource modifications, and system errors.

### Settings
The **Settings** page allows you to:
- Change your user profile information.
- Update your language preference.
- Toggle system settings like Demo Mode.

---

## Troubleshooting

- **Server fails to start**: Ensure Node.js 24 is installed and no other process is using port 3001.
- **Authentication fails**: Check `etc/config.json` for custom JWT secret keys and ensure the `data/admin.db` file is writable.
- **Language not changing**: Ensure your browser's local storage is not blocked, as the application uses it to persist UI state.
