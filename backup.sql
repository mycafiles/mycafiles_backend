--
-- PostgreSQL database dump
--

\restrict Bo0sTd8hOukD1ebSk52Rfjyl8WxDDSTIlFOLlePqaaLEAZ5EvZuH4QxH8aq475G

-- Dumped from database version 18.3
-- Dumped by pg_dump version 18.3

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: ActivityAction; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."ActivityAction" AS ENUM (
    'CREATE_CLIENT',
    'UPDATE_CLIENT',
    'DELETE_CLIENT',
    'GENERATE_FOLDERS',
    'UPLOAD_FILE',
    'DELETE_FILE',
    'RESTORE_FILE',
    'PERMANENT_DELETE_FILE',
    'CREATE_FOLDER',
    'DELETE_FOLDER',
    'RESTORE_FOLDER',
    'PERMANENT_DELETE_FOLDER',
    'LOGIN',
    'CA_REGISTER',
    'UPDATE_PROFILE',
    'APPROVE_DEVICE',
    'REJECT_DEVICE'
);


ALTER TYPE public."ActivityAction" OWNER TO postgres;

--
-- Name: ClientType; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."ClientType" AS ENUM (
    'INDIVIDUAL',
    'BUSINESS'
);


ALTER TYPE public."ClientType" OWNER TO postgres;

--
-- Name: DeviceStatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."DeviceStatus" AS ENUM (
    'PENDING',
    'APPROVED'
);


ALTER TYPE public."DeviceStatus" OWNER TO postgres;

--
-- Name: FileCategory; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."FileCategory" AS ENUM (
    'GENERAL',
    'GST',
    'KYC',
    'ITR',
    'TDS'
);


ALTER TYPE public."FileCategory" OWNER TO postgres;

--
-- Name: FolderCategory; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."FolderCategory" AS ENUM (
    'ITR',
    'GST',
    'TDS',
    'KYC',
    'GENERAL'
);


ALTER TYPE public."FolderCategory" OWNER TO postgres;

--
-- Name: HelpAudience; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."HelpAudience" AS ENUM (
    'ca',
    'client'
);


ALTER TYPE public."HelpAudience" OWNER TO postgres;

--
-- Name: NotificationType; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."NotificationType" AS ENUM (
    'FILE_UPLOAD',
    'DEVICE_APPROVAL',
    'GENERAL'
);


ALTER TYPE public."NotificationType" OWNER TO postgres;

--
-- Name: RequestStatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."RequestStatus" AS ENUM (
    'PENDING',
    'APPROVED',
    'REJECTED'
);


ALTER TYPE public."RequestStatus" OWNER TO postgres;

--
-- Name: UploadedBy; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."UploadedBy" AS ENUM (
    'CA',
    'CUSTOMER'
);


ALTER TYPE public."UploadedBy" OWNER TO postgres;

--
-- Name: UserRole; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."UserRole" AS ENUM (
    'SUPERADMIN',
    'CAADMIN',
    'CLIENT'
);


ALTER TYPE public."UserRole" OWNER TO postgres;

--
-- Name: UserStatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."UserStatus" AS ENUM (
    'active',
    'inactive'
);


ALTER TYPE public."UserStatus" OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: ActivityLog; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."ActivityLog" (
    id text NOT NULL,
    "caId" text NOT NULL,
    action public."ActivityAction" NOT NULL,
    details text NOT NULL,
    "clientId" text,
    "clientName" text,
    "docId" text,
    "folderId" text,
    "ipAddress" text,
    "timestamp" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."ActivityLog" OWNER TO postgres;

--
-- Name: Banner; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Banner" (
    id text NOT NULL,
    title text NOT NULL,
    "imageUrl" text NOT NULL,
    "publicId" text NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "order" integer DEFAULT 0 NOT NULL,
    "caId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."Banner" OWNER TO postgres;

--
-- Name: Client; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Client" (
    id text NOT NULL,
    "caId" text NOT NULL,
    name text NOT NULL,
    "mobileNumber" text NOT NULL,
    "panNumber" text NOT NULL,
    "gstNumber" text,
    "tanNumber" text,
    dob timestamp(3) without time zone,
    "fileNumber" integer NOT NULL,
    type public."ClientType" NOT NULL,
    "customFields" jsonb,
    "gstId" text,
    "gstPassword" text,
    address text,
    "isActive" boolean DEFAULT true NOT NULL,
    "deviceId" text,
    "deviceStatus" public."DeviceStatus" DEFAULT 'PENDING'::public."DeviceStatus" NOT NULL,
    "allowedDevices" text[],
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    email text,
    "groupName" text,
    "tradeName" text
);


ALTER TABLE public."Client" OWNER TO postgres;

--
-- Name: Document; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Document" (
    id text NOT NULL,
    "clientId" text NOT NULL,
    "folderId" text,
    "fileName" text NOT NULL,
    "fileUrl" text NOT NULL,
    "cloudinaryId" text NOT NULL,
    "fileType" text,
    "fileSize" integer NOT NULL,
    "uploadedBy" public."UploadedBy" NOT NULL,
    category public."FileCategory" DEFAULT 'GENERAL'::public."FileCategory" NOT NULL,
    "isDeleted" boolean DEFAULT false NOT NULL,
    "deletedAt" timestamp(3) without time zone,
    "deletedBy" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "documentNumber" text,
    "displayName" text
);


ALTER TABLE public."Document" OWNER TO postgres;

--
-- Name: FAQ; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."FAQ" (
    id text NOT NULL,
    question text NOT NULL,
    answer text NOT NULL,
    audience public."HelpAudience" NOT NULL,
    "order" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."FAQ" OWNER TO postgres;

--
-- Name: Folder; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Folder" (
    id text NOT NULL,
    name text NOT NULL,
    "clientId" text NOT NULL,
    category public."FolderCategory" NOT NULL,
    "parentFolderId" text,
    path jsonb,
    "isDeleted" boolean DEFAULT false NOT NULL,
    "deletedAt" timestamp(3) without time zone,
    "deletedBy" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "isPredefined" boolean DEFAULT false NOT NULL
);


ALTER TABLE public."Folder" OWNER TO postgres;

--
-- Name: HelpArticle; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."HelpArticle" (
    id text NOT NULL,
    title text NOT NULL,
    content text NOT NULL,
    category text DEFAULT 'General'::text NOT NULL,
    audience public."HelpAudience" NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."HelpArticle" OWNER TO postgres;

--
-- Name: LoginRequest; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."LoginRequest" (
    id text NOT NULL,
    "clientId" text NOT NULL,
    "deviceId" text NOT NULL,
    "deviceName" text,
    status public."RequestStatus" DEFAULT 'PENDING'::public."RequestStatus" NOT NULL,
    "requestDate" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."LoginRequest" OWNER TO postgres;

--
-- Name: Notification; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Notification" (
    id text NOT NULL,
    "recipientId" text,
    "senderId" text,
    title text NOT NULL,
    message text NOT NULL,
    type public."NotificationType" DEFAULT 'GENERAL'::public."NotificationType" NOT NULL,
    "isRead" boolean DEFAULT false NOT NULL,
    "docId" text,
    "clientId" text,
    "folderId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "senderUserId" text
);


ALTER TABLE public."Notification" OWNER TO postgres;

--
-- Name: User; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."User" (
    id text NOT NULL,
    name text NOT NULL,
    email text NOT NULL,
    password text NOT NULL,
    role public."UserRole" DEFAULT 'CAADMIN'::public."UserRole" NOT NULL,
    status public."UserStatus" DEFAULT 'active'::public."UserStatus" NOT NULL,
    phone text,
    "FRNno" text,
    "resetPasswordToken" text,
    "resetPasswordExpire" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."User" OWNER TO postgres;

--
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 0 NOT NULL
);


ALTER TABLE public._prisma_migrations OWNER TO postgres;

--
-- Data for Name: ActivityLog; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."ActivityLog" (id, "caId", action, details, "clientId", "clientName", "docId", "folderId", "ipAddress", "timestamp", "createdAt", "updatedAt") FROM stdin;
cmn2nz7dx0002s3m320w20bfp	cmn2nz7ah0000s3m3pks59493	CA_REGISTER	New CA registered: Super Admin Test (test@admin.com)	\N	\N	\N	\N	\N	2026-03-23 04:06:49.885	2026-03-23 04:06:49.889	2026-03-23 04:06:49.889
cmn2o21yg0004s3m33br2j017	cmn2nz7ah0000s3m3pks59493	UPDATE_PROFILE	Profile updated for CA: Updated Admin Name	\N	\N	\N	\N	\N	2026-03-23 04:09:02.822	2026-03-23 04:09:02.824	2026-03-23 04:09:02.824
cmn2se9p7008dfho9n365excp	cmn2ol0ae0000d8dbu2s1mv6u	GENERATE_FOLDERS	Generated standard folder structure for client: XYZ Pvt Ltd	\N	\N	\N	\N	\N	2026-03-23 06:10:31.194	2026-03-23 06:10:31.196	2026-03-23 06:10:31.196
cmn2se9p9008ffho9k3jwi0by	cmn2ol0ae0000d8dbu2s1mv6u	CREATE_CLIENT	Created new client: XYZ Pvt Ltd (XYZAB1234K)	\N	XYZ Pvt Ltd	\N	\N	\N	2026-03-23 06:10:31.196	2026-03-23 06:10:31.197	2026-03-23 06:10:31.197
cmn2seiy300g3fho9nlqgnire	cmn2ol0ae0000d8dbu2s1mv6u	GENERATE_FOLDERS	Generated standard folder structure for client: Multi Services Ltd	\N	\N	\N	\N	\N	2026-03-23 06:10:43.178	2026-03-23 06:10:43.18	2026-03-23 06:10:43.18
cmn2seiy600g5fho93m3ztri6	cmn2ol0ae0000d8dbu2s1mv6u	CREATE_CLIENT	Created new client: Multi Services Ltd (MULTI1234X)	\N	Multi Services Ltd	\N	\N	\N	2026-03-23 06:10:43.181	2026-03-23 06:10:43.182	2026-03-23 06:10:43.182
cmn2vzggn007xxtmjp2xjn8ww	cmn2ol0ae0000d8dbu2s1mv6u	GENERATE_FOLDERS	Generated standard folder structure for client: Multi Services Ltd	\N	\N	\N	\N	\N	2026-03-23 07:50:58.581	2026-03-23 07:50:58.583	2026-03-23 07:50:58.583
cmn2vzggp007zxtmjdtdqb3fh	cmn2ol0ae0000d8dbu2s1mv6u	CREATE_CLIENT	Created new client: Multi Services Ltd (MULTI1234X)	\N	Multi Services Ltd	\N	\N	\N	2026-03-23 07:50:58.584	2026-03-23 07:50:58.586	2026-03-23 07:50:58.586
cmn5ac343008ntmurb2fcq5dl	cmn2ol0ae0000d8dbu2s1mv6u	GENERATE_FOLDERS	Generated standard folder structure for client: prarthana vaghani	\N	\N	\N	\N	\N	2026-03-25 00:08:14.786	2026-03-25 00:08:14.788	2026-03-25 00:08:14.788
cmn5ac34e008ptmurdjwgjigt	cmn2ol0ae0000d8dbu2s1mv6u	CREATE_CLIENT	Created new client: prarthana vaghani (ABCDE1234I)	\N	prarthana vaghani	\N	\N	\N	2026-03-25 00:08:14.796	2026-03-25 00:08:14.798	2026-03-25 00:08:14.798
cmn2ryns0006vxvp2lo9dp3wl	cmn2ol0ae0000d8dbu2s1mv6u	GENERATE_FOLDERS	Generated standard folder structure for client: ABC Traders	\N	\N	\N	\N	\N	2026-03-23 05:58:22.943	2026-03-23 05:58:22.945	2026-03-23 05:58:22.945
cmn2ryns4006xxvp2wr0vo56n	cmn2ol0ae0000d8dbu2s1mv6u	CREATE_CLIENT	Created new client: ABC Traders (ABCDE1234F)	\N	ABC Traders	\N	\N	\N	2026-03-23 05:58:22.947	2026-03-23 05:58:22.949	2026-03-23 05:58:22.949
cmn4w825d0003tmureble0w2r	cmn2ol0ae0000d8dbu2s1mv6u	UPLOAD_FILE	Uploaded file: Insurance_Claim_SaaS_Proposal.pdf	\N	\N	\N	\N	\N	2026-03-24 17:33:12.286	2026-03-24 17:33:12.289	2026-03-24 17:33:12.289
cmn4wdb8g000dtmur5o8f7pwl	cmn2ol0ae0000d8dbu2s1mv6u	UPLOAD_FILE	Uploaded file: Insurance_Claim_SaaS_Proposal.pdf	\N	\N	\N	\N	\N	2026-03-24 17:37:17.343	2026-03-24 17:37:17.344	2026-03-24 17:37:17.344
cmn44dwue0009hjkqb2benzej	cmn2ol0ae0000d8dbu2s1mv6u	CREATE_FOLDER	Created folder: April Tax Returns 2024	\N	\N	\N	\N	\N	2026-03-24 04:33:56.101	2026-03-24 04:33:56.102	2026-03-24 04:33:56.102
cmn2sdo6c000nfho9trq63asc	cmn2ol0ae0000d8dbu2s1mv6u	GENERATE_FOLDERS	Generated standard folder structure for client: Rahul Sharma	\N	\N	\N	\N	\N	2026-03-23 06:10:03.299	2026-03-23 06:10:03.3	2026-03-23 06:10:03.3
cmn2sdo6h000pfho9b7j6pg4b	cmn2ol0ae0000d8dbu2s1mv6u	CREATE_CLIENT	Created new client: Rahul Sharma (ABCDE1234Y)	\N	Rahul Sharma	\N	\N	\N	2026-03-23 06:10:03.304	2026-03-23 06:10:03.305	2026-03-23 06:10:03.305
cmn5ba2ia0002a22uwdguukt2	cmn2ol0ae0000d8dbu2s1mv6u	UPLOAD_FILE	Uploaded file: Insurance_Claim_SaaS_Proposal.pdf	\N	\N	\N	\N	\N	2026-03-25 00:34:40.304	2026-03-25 00:34:40.305	2026-03-25 00:34:40.305
cmn5bfb91000171nae565gy6r	cmn2ol0ae0000d8dbu2s1mv6u	DELETE_FILE	Moved file to recycle bin: Insurance_Claim_SaaS_Proposal.pdf	\N	\N	\N	\N	\N	2026-03-25 00:38:44.916	2026-03-25 00:38:44.917	2026-03-25 00:38:44.917
cmn5bbu3e000ca22ujqpc6qmu	cmn2ol0ae0000d8dbu2s1mv6u	UPLOAD_FILE	Uploaded file: ic_tds_folder.svg	\N	\N	\N	\N	\N	2026-03-25 00:36:02.713	2026-03-25 00:36:02.714	2026-03-25 00:36:02.714
cmn5bfdnp000371naigthqw9y	cmn2ol0ae0000d8dbu2s1mv6u	DELETE_FILE	Moved file to recycle bin: ic_tds_folder.svg	\N	\N	\N	\N	\N	2026-03-25 00:38:48.035	2026-03-25 00:38:48.037	2026-03-25 00:38:48.037
cmn5bbdnv0007a22uoeh8xm2o	cmn2ol0ae0000d8dbu2s1mv6u	UPLOAD_FILE	Uploaded file: Insurance_Claim_SaaS_Proposal.docx	\N	\N	\N	\N	\N	2026-03-25 00:35:41.418	2026-03-25 00:35:41.419	2026-03-25 00:35:41.419
cmn5bffzy000571narmr949vz	cmn2ol0ae0000d8dbu2s1mv6u	DELETE_FILE	Moved file to recycle bin: Insurance_Claim_SaaS_Proposal.docx	\N	\N	\N	\N	\N	2026-03-25 00:38:51.07	2026-03-25 00:38:51.071	2026-03-25 00:38:51.071
cmn5ayuxs0003y8a8v9kl6mwr	cmn2ol0ae0000d8dbu2s1mv6u	CREATE_FOLDER	Created folder: new folder	\N	\N	\N	\N	\N	2026-03-25 00:25:57.277	2026-03-25 00:25:57.28	2026-03-25 00:25:57.28
cmn5k0h4d000765iw9l0tcnwx	cmn2ol0ae0000d8dbu2s1mv6u	CREATE_CLIENT	Bulk uploaded 3 clients successfully	\N	\N	\N	\N	\N	2026-03-25 04:39:09.227	2026-03-25 04:39:09.229	2026-03-25 04:39:09.229
cmn5kwmen0003i23yz9zxk8i5	cmn2ol0ae0000d8dbu2s1mv6u	CREATE_CLIENT	Bulk uploaded 1 clients successfully	\N	\N	\N	\N	\N	2026-03-25 05:04:09.067	2026-03-25 05:04:09.071	2026-03-25 05:04:09.071
cmn5j5myn009usc076xyndxvv	cmn2ol0ae0000d8dbu2s1mv6u	GENERATE_FOLDERS	Generated standard folder structure for client: kirtan narola	\N	\N	\N	\N	\N	2026-03-25 04:15:10.461	2026-03-25 04:15:10.463	2026-03-25 04:15:10.463
cmn453r9a0001ibz090yjr6rs	cmn2ol0ae0000d8dbu2s1mv6u	UPDATE_CLIENT	Updated details for client: ABC Traders	\N	ABC Traders	\N	\N	\N	2026-03-24 04:54:01.917	2026-03-24 04:54:01.918	2026-03-24 04:54:01.918
cmn45o50y0001ip0nuraai21m	cmn2ol0ae0000d8dbu2s1mv6u	UPDATE_CLIENT	Updated details for client: ABC Traders	\N	ABC Traders	\N	\N	\N	2026-03-24 05:09:52.881	2026-03-24 05:09:52.883	2026-03-24 05:09:52.883
cmn5ie2910001sc072b5dszx6	cmn2ol0ae0000d8dbu2s1mv6u	UPDATE_CLIENT	Updated details for client: ABC Traders	\N	ABC Traders	\N	\N	\N	2026-03-25 03:53:43.899	2026-03-25 03:53:43.901	2026-03-25 03:53:43.901
cmn4wlbp0000jtmurfyz8pc9f	cmn2ol0ae0000d8dbu2s1mv6u	UPLOAD_FILE	Uploaded file: Insurance_Claim_SaaS_Proposal.pdf	\N	\N	\N	\N	\N	2026-03-24 17:43:31.187	2026-03-24 17:43:31.188	2026-03-24 17:43:31.188
cmn5c2gxl0002c5utdipt18qk	cmn2ol0ae0000d8dbu2s1mv6u	UPLOAD_FILE	Uploaded file: Insurance_Claim_SaaS_Proposal.pdf	\N	\N	\N	\N	\N	2026-03-25 00:56:45.366	2026-03-25 00:56:45.369	2026-03-25 00:56:45.369
cmn5c3thw0006c5utw35k5ier	cmn2ol0ae0000d8dbu2s1mv6u	DELETE_FILE	Moved file to recycle bin: Insurance_Claim_SaaS_Proposal.pdf	\N	\N	\N	\N	\N	2026-03-25 00:57:48.305	2026-03-25 00:57:48.308	2026-03-25 00:57:48.308
cmn5chvq0000ec5utfm7hkp2p	cmn2ol0ae0000d8dbu2s1mv6u	CREATE_FOLDER	Created folder: Untitled Folder	\N	\N	\N	\N	\N	2026-03-25 01:08:44.375	2026-03-25 01:08:44.376	2026-03-25 01:08:44.376
cmn44c3vo0005hjkqdi1v5mgp	cmn2ol0ae0000d8dbu2s1mv6u	CREATE_FOLDER	Created folder: Tax Returns 2024	\N	\N	\N	\N	\N	2026-03-24 04:32:31.908	2026-03-24 04:32:31.909	2026-03-24 04:32:31.909
cmn5l43480007137ad83xvt2h	cmn2ol0ae0000d8dbu2s1mv6u	UPDATE_CLIENT	Updated details for client: ABC Trader	\N	ABC Trader	\N	\N	\N	2026-03-25 05:09:57.319	2026-03-25 05:09:57.321	2026-03-25 05:09:57.321
cmn5c40c00009c5uttaqqywxs	cmn2ol0ae0000d8dbu2s1mv6u	UPLOAD_FILE	Uploaded file: Insurance_Claim_SaaS_Proposal.pdf	\N	\N	\N	\N	\N	2026-03-25 00:57:57.166	2026-03-25 00:57:57.168	2026-03-25 00:57:57.168
cmn5if3al0004sc07wbkmb8ky	cmn2ol0ae0000d8dbu2s1mv6u	UPLOAD_FILE	Uploaded file: Insurance_Claim_SaaS_Proposal.pdf	\N	\N	\N	\N	\N	2026-03-25 03:54:31.916	2026-03-25 03:54:31.917	2026-03-25 03:54:31.917
cmn5j5myx009wsc072baq8vhz	cmn2ol0ae0000d8dbu2s1mv6u	CREATE_CLIENT	Created new client: kirtan narola (QWERT1234S)	\N	kirtan narola	\N	\N	\N	2026-03-25 04:15:10.473	2026-03-25 04:15:10.474	2026-03-25 04:15:10.474
cmn5az2ts0007y8a8085yxgwg	cmn2ol0ae0000d8dbu2s1mv6u	CREATE_FOLDER	Created folder: new folder 2	\N	\N	\N	\N	\N	2026-03-25 00:26:07.502	2026-03-25 00:26:07.505	2026-03-25 00:26:07.505
cmn5p5xc3000277qnrec4owip	cmn2ol0ae0000d8dbu2s1mv6u	UPLOAD_FILE	Uploaded file: project_brif.pdf	\N	\N	\N	\N	\N	2026-03-25 07:03:21.601	2026-03-25 07:03:21.603	2026-03-25 07:03:21.603
cmn5pov3y000677qns3y60508	cmn2ol0ae0000d8dbu2s1mv6u	DELETE_FOLDER	Moved folder to recycle bin: new folder 2	\N	\N	\N	\N	\N	2026-03-25 07:18:05.18	2026-03-25 07:18:05.182	2026-03-25 07:18:05.182
cmn5ikm590082sc079ocqe9x6	cmn2ol0ae0000d8dbu2s1mv6u	GENERATE_FOLDERS	Generated standard folder structure for client: Kriyona Infotech	\N	\N	\N	\N	\N	2026-03-25 03:58:49.627	2026-03-25 03:58:49.629	2026-03-25 03:58:49.629
cmn5ikm6f0084sc07xhhoq0gd	cmn2ol0ae0000d8dbu2s1mv6u	CREATE_CLIENT	Created new client: Kriyona Infotech (QWERT1234R)	\N	Kriyona Infotech	\N	\N	\N	2026-03-25 03:58:49.67	2026-03-25 03:58:49.671	2026-03-25 03:58:49.671
cmn5k0heq00d565iw5qm6ccp5	cmn2ol0ae0000d8dbu2s1mv6u	GENERATE_FOLDERS	Generated standard folder structure for client: Raj Patel	\N	\N	\N	\N	\N	2026-03-25 04:39:09.6	2026-03-25 04:39:09.602	2026-03-25 04:39:09.602
cmn5k0h83001v65iw14qhqch7	cmn2ol0ae0000d8dbu2s1mv6u	GENERATE_FOLDERS	Generated standard folder structure for client: Amit Shah	\N	\N	\N	\N	\N	2026-03-25 04:39:09.361	2026-03-25 04:39:09.364	2026-03-25 04:39:09.364
cmn5k0hh100f165iwdsb27rd6	cmn2ol0ae0000d8dbu2s1mv6u	GENERATE_FOLDERS	Generated standard folder structure for client: Neha Jain	\N	\N	\N	\N	\N	2026-03-25 04:39:09.683	2026-03-25 04:39:09.686	2026-03-25 04:39:09.686
cmn5kwmsa007xi23y6to8lcb4	cmn2ol0ae0000d8dbu2s1mv6u	GENERATE_FOLDERS	Generated standard folder structure for client: ABC Enterprises	\N	\N	\N	\N	\N	2026-03-25 05:04:09.561	2026-03-25 05:04:09.562	2026-03-25 05:04:09.562
cmn5q9hnl000pxq4vis8r4lf0	cmn2ol0ae0000d8dbu2s1mv6u	CREATE_CLIENT	Bulk uploaded 2 clients successfully	\N	\N	\N	\N	\N	2026-03-25 07:34:07.52	2026-03-25 07:34:07.522	2026-03-25 07:34:07.522
cmn5q9r2v009lxq4v7gt8yzn0	cmn2ol0ae0000d8dbu2s1mv6u	CREATE_CLIENT	Bulk uploaded 3 clients successfully	\N	\N	\N	\N	\N	2026-03-25 07:34:19.733	2026-03-25 07:34:19.735	2026-03-25 07:34:19.735
cmn5q9hp8001jxq4vkntbryze	cmn2ol0ae0000d8dbu2s1mv6u	GENERATE_FOLDERS	Generated standard folder structure for client: John Doe	\N	\N	\N	\N	\N	2026-03-25 07:34:07.578	2026-03-25 07:34:07.581	2026-03-25 07:34:07.581
cmn5q9i3d009dxq4vxwj99b0g	cmn2ol0ae0000d8dbu2s1mv6u	GENERATE_FOLDERS	Generated standard folder structure for client: ABC Enterprises	\N	\N	\N	\N	\N	2026-03-25 07:34:08.088	2026-03-25 07:34:08.09	2026-03-25 07:34:08.09
cmn5q9rf400ofxq4vpiru79xn	cmn2ol0ae0000d8dbu2s1mv6u	GENERATE_FOLDERS	Generated standard folder structure for client: Neha Jain	\N	\N	\N	\N	\N	2026-03-25 07:34:20.174	2026-03-25 07:34:20.176	2026-03-25 07:34:20.176
cmn5q9re100nnxq4vyecwbb49	cmn2ol0ae0000d8dbu2s1mv6u	GENERATE_FOLDERS	Generated standard folder structure for client: Raj Patel	\N	\N	\N	\N	\N	2026-03-25 07:34:20.136	2026-03-25 07:34:20.137	2026-03-25 07:34:20.137
cmn5qa0zl00oixq4vszj7qv2n	cmn2ol0ae0000d8dbu2s1mv6u	CREATE_FOLDER	Created folder: test folder	\N	\N	\N	\N	\N	2026-03-25 07:34:32.575	2026-03-25 07:34:32.577	2026-03-25 07:34:32.577
cmn5q9r5g00b1xq4vzg345l9d	cmn2ol0ae0000d8dbu2s1mv6u	GENERATE_FOLDERS	Generated standard folder structure for client: Amit Shah	\N	\N	\N	\N	\N	2026-03-25 07:34:19.827	2026-03-25 07:34:19.829	2026-03-25 07:34:19.829
cmn5qls1z000f957gpqu0ex4m	cmn2ol0ae0000d8dbu2s1mv6u	CREATE_CLIENT	Bulk uploaded 2 clients successfully	\N	\N	\N	\N	\N	2026-03-25 07:43:40.87	2026-03-25 07:43:40.871	2026-03-25 07:43:40.871
cmn5qls3w0021957g6chq0u3b	cmn2ol0ae0000d8dbu2s1mv6u	GENERATE_FOLDERS	Generated standard folder structure for client: John Doe	\N	\N	\N	\N	\N	2026-03-25 07:43:40.94	2026-03-25 07:43:40.941	2026-03-25 07:43:40.941
cmn715oq60071hgdd0fk8sq3h	cmn2ol0ae0000d8dbu2s1mv6u	GENERATE_FOLDERS	Generated standard folder structure for client: John Doe	\N	\N	\N	\N	\N	2026-03-26 05:26:52.011	2026-03-26 05:26:52.014	2026-03-26 05:26:52.014
cmn715or80073hgddfm59097q	cmn2ol0ae0000d8dbu2s1mv6u	UPDATE_CLIENT	Updated details for client: John Doe	\N	John Doe	\N	\N	\N	2026-03-26 05:26:52.051	2026-03-26 05:26:52.053	2026-03-26 05:26:52.053
cmn6x8hk70001ff9knsqnc77i	cmn2ol0ae0000d8dbu2s1mv6u	UPLOAD_FILE	Uploaded file: 259099746356_1774441184490.pdf	\N	\N	\N	\N	\N	2026-03-26 03:37:04.224	2026-03-26 03:37:04.227	2026-03-26 03:37:04.227
cmn5ru6nt000412gmox9x3zkp	cmn2ol0ae0000d8dbu2s1mv6u	UPLOAD_FILE	Uploaded file: WhatsApp Image 2026-03-25 at 11.49.50 AM.jpeg	\N	\N	\N	\N	\N	2026-03-25 08:18:12.664	2026-03-25 08:18:12.666	2026-03-25 08:18:12.666
cmn738vge000713a7w0wqutlw	cmn2ol0ae0000d8dbu2s1mv6u	UPLOAD_FILE	Uploaded file: Screenshot 2026-01-10 100139.png	\N	\N	\N	\N	\N	2026-03-26 06:25:19.93	2026-03-26 06:25:19.934	2026-03-26 06:25:19.934
cmn5qlseb0093957gwsp28791	cmn2ol0ae0000d8dbu2s1mv6u	GENERATE_FOLDERS	Generated standard folder structure for client: ABC Enterprises	\N	\N	\N	\N	\N	2026-03-25 07:43:41.314	2026-03-25 07:43:41.315	2026-03-25 07:43:41.315
cmn77tnqy00072pyiphtyrchq	cmn2ol0ae0000d8dbu2s1mv6u	CREATE_CLIENT	Bulk uploaded 3 clients successfully	\N	\N	\N	\N	\N	2026-03-26 08:33:28.184	2026-03-26 08:33:28.187	2026-03-26 08:33:28.187
cmn77to00002d2pyi9ckunk7c	cmn2ol0ae0000d8dbu2s1mv6u	GENERATE_FOLDERS	Generated standard folder structure for client: Amit Shah	\N	\N	\N	\N	\N	2026-03-26 08:33:28.51	2026-03-26 08:33:28.512	2026-03-26 08:33:28.512
cmn77yf2700ff2pyizsdc9uv9	cmn2ol0ae0000d8dbu2s1mv6u	GENERATE_FOLDERS	Generated standard folder structure for client: Amit Shah	\N	\N	\N	\N	\N	2026-03-26 08:37:10.206	2026-03-26 08:37:10.207	2026-03-26 08:37:10.207
cmn77yf2d00fh2pyi6aqcdajm	cmn2ol0ae0000d8dbu2s1mv6u	UPDATE_CLIENT	Updated details for client: Amit Shah	\N	Amit Shah	\N	\N	\N	2026-03-26 08:37:10.212	2026-03-26 08:37:10.213	2026-03-26 08:37:10.213
cmn88o8qm0002ubotc96ge9te	cmn2ol0ae0000d8dbu2s1mv6u	UPLOAD_FILE	Uploaded file: WhatsApp Image 2026-03-26 at 11.54.40 AM (2).jpeg	\N	\N	\N	\N	\N	2026-03-27 01:45:01.243	2026-03-27 01:45:01.245	2026-03-27 01:45:01.245
cmn8ermyh001vg0tvqmk42iem	cmn2ol0ae0000d8dbu2s1mv6u	GENERATE_FOLDERS	Generated standard folder structure for client: kirtan narola	cmn8ermhw0001g0tv2tsvykws	\N	\N	\N	\N	2026-03-27 04:35:37.334	2026-03-27 04:35:37.337	2026-03-27 04:35:37.337
cmn8ermyv001xg0tv6it0pe6q	cmn2ol0ae0000d8dbu2s1mv6u	CREATE_CLIENT	Created new client: kirtan narola (ABCDE1234D)	cmn8ermhw0001g0tv2tsvykws	kirtan narola	\N	\N	\N	2026-03-27 04:35:37.348	2026-03-27 04:35:37.351	2026-03-27 04:35:37.351
cmn8f0m6h00a11prnc2av4icl	cmn2ol0ae0000d8dbu2s1mv6u	GENERATE_FOLDERS	Generated standard folder structure for client: Kriyona Infotech	cmn8f0ld500011prngxd0ftqg	\N	\N	\N	\N	2026-03-27 04:42:36.232	2026-03-27 04:42:36.233	2026-03-27 04:42:36.233
cmn8f0m6k00a31prnhj2mzpct	cmn2ol0ae0000d8dbu2s1mv6u	CREATE_CLIENT	Created new client: Kriyona Infotech (ABCDE1234I)	cmn8f0ld500011prngxd0ftqg	Kriyona Infotech	\N	\N	\N	2026-03-27 04:42:36.236	2026-03-27 04:42:36.237	2026-03-27 04:42:36.237
cmn8fifpk0002uvl4bm887r1z	cmn2ol0ae0000d8dbu2s1mv6u	UPLOAD_FILE	Uploaded file: error_report.xlsx	cmn8f0ld500011prngxd0ftqg	\N	cmn8fifo80000uvl4x2anrxez	\N	\N	2026-03-27 04:56:27.654	2026-03-27 04:56:27.656	2026-03-27 04:56:27.656
cmn77tor300f12pyin7xmkabm	cmn2ol0ae0000d8dbu2s1mv6u	GENERATE_FOLDERS	Generated standard folder structure for client: Raj Patel	\N	\N	\N	\N	\N	2026-03-26 08:33:29.485	2026-03-26 08:33:29.488	2026-03-26 08:33:29.488
cmn77xwzy00f72pyiha61uu53	cmn2ol0ae0000d8dbu2s1mv6u	GENERATE_FOLDERS	Generated standard folder structure for client: John Doe	\N	\N	\N	\N	\N	2026-03-26 08:36:46.797	2026-03-26 08:36:46.798	2026-03-26 08:36:46.798
cmn77xx0400f92pyijxibpm0y	cmn2ol0ae0000d8dbu2s1mv6u	UPDATE_CLIENT	Updated details for client: John Doe	\N	John Doe	\N	\N	\N	2026-03-26 08:36:46.802	2026-03-26 08:36:46.804	2026-03-26 08:36:46.804
cmn78t4ic0001lbzbw53yvzxr	cmn2ol0ae0000d8dbu2s1mv6u	GENERATE_FOLDERS	Generated standard folder structure for client: John Doe	\N	\N	\N	\N	\N	2026-03-26 09:01:02.862	2026-03-26 09:01:02.864	2026-03-26 09:01:02.864
cmn78t4ki0003lbzbzp5niejj	cmn2ol0ae0000d8dbu2s1mv6u	UPDATE_CLIENT	Updated details for client: John Doe	\N	John Doe	\N	\N	\N	2026-03-26 09:01:02.944	2026-03-26 09:01:02.946	2026-03-26 09:01:02.946
cmn7324j2000213a7rq7ddkd7	cmn2ol0ae0000d8dbu2s1mv6u	UPLOAD_FILE	Uploaded file: GST CERTIFICATE.pdf	\N	\N	\N	\N	\N	2026-03-26 06:20:05.1	2026-03-26 06:20:05.102	2026-03-26 06:20:05.102
cmn5qnpqf0096957gewqp4nng	cmn2ol0ae0000d8dbu2s1mv6u	UPLOAD_FILE	Uploaded file: WhatsApp Image 2026-03-25 at 11.49.50 AM (1).jpeg	\N	\N	\N	\N	\N	2026-03-25 07:45:11.174	2026-03-25 07:45:11.175	2026-03-25 07:45:11.175
cmn5qol3q009a957gq53sekns	cmn2ol0ae0000d8dbu2s1mv6u	DELETE_FILE	Moved file to recycle bin: WhatsApp Image 2026-03-25 at 11.49.50 AM (1).jpeg	\N	\N	\N	\N	\N	2026-03-25 07:45:51.829	2026-03-25 07:45:51.83	2026-03-25 07:45:51.83
cmn5rtzol000112gmrq3husd5	cmn2ol0ae0000d8dbu2s1mv6u	DELETE_FILE	Moved file to recycle bin: WhatsApp Image 2026-03-25 at 11.49.50 AM (1).jpeg	\N	\N	\N	\N	\N	2026-03-25 08:18:03.616	2026-03-25 08:18:03.618	2026-03-25 08:18:03.618
cmn77y9ar00fb2pyiv9etrp9m	cmn2ol0ae0000d8dbu2s1mv6u	GENERATE_FOLDERS	Generated standard folder structure for client: Raj Patel	\N	\N	\N	\N	\N	2026-03-26 08:37:02.738	2026-03-26 08:37:02.739	2026-03-26 08:37:02.739
cmn77y9ay00fd2pyifiqh2see	cmn2ol0ae0000d8dbu2s1mv6u	UPDATE_CLIENT	Updated details for client: Raj Patel	\N	Raj Patel	\N	\N	\N	2026-03-26 08:37:02.744	2026-03-26 08:37:02.746	2026-03-26 08:37:02.746
cmn78u6fi0005lbzbzprdij11	cmn2ol0ae0000d8dbu2s1mv6u	GENERATE_FOLDERS	Generated standard folder structure for client: Raj Patel	\N	\N	\N	\N	\N	2026-03-26 09:01:52.011	2026-03-26 09:01:52.014	2026-03-26 09:01:52.014
cmn78u6g20007lbzbv2gc2pzz	cmn2ol0ae0000d8dbu2s1mv6u	UPDATE_CLIENT	Updated details for client: Raj Patel	\N	Raj Patel	\N	\N	\N	2026-03-26 09:01:52.033	2026-03-26 09:01:52.034	2026-03-26 09:01:52.034
cmn77toqz00ex2pyinaee7eqk	cmn2ol0ae0000d8dbu2s1mv6u	GENERATE_FOLDERS	Generated standard folder structure for client: Neha Jain	\N	\N	\N	\N	\N	2026-03-26 08:33:29.481	2026-03-26 08:33:29.483	2026-03-26 08:33:29.483
cmn77ykd400fj2pyiss3lnevi	cmn2ol0ae0000d8dbu2s1mv6u	GENERATE_FOLDERS	Generated standard folder structure for client: Neha Jain	\N	\N	\N	\N	\N	2026-03-26 08:37:17.08	2026-03-26 08:37:17.081	2026-03-26 08:37:17.081
cmn77ykda00fl2pyihk4ed3oy	cmn2ol0ae0000d8dbu2s1mv6u	UPDATE_CLIENT	Updated details for client: Neha Jain	\N	Neha Jain	\N	\N	\N	2026-03-26 08:37:17.083	2026-03-26 08:37:17.086	2026-03-26 08:37:17.086
cmn78uf3m0009lbzbq1s1kzy1	cmn2ol0ae0000d8dbu2s1mv6u	GENERATE_FOLDERS	Generated standard folder structure for client: Neha Jain	\N	\N	\N	\N	\N	2026-03-26 09:02:03.245	2026-03-26 09:02:03.249	2026-03-26 09:02:03.249
cmn78uf3y000blbzbn1q1jzip	cmn2ol0ae0000d8dbu2s1mv6u	UPDATE_CLIENT	Updated details for client: Neha Jain	\N	Neha Jain	\N	\N	\N	2026-03-26 09:02:03.26	2026-03-26 09:02:03.262	2026-03-26 09:02:03.262
cmn77u9rp00f32pyibxxy2za6	cmn2ol0ae0000d8dbu2s1mv6u	GENERATE_FOLDERS	Generated standard folder structure for client: ABC Enterprises	\N	\N	\N	\N	\N	2026-03-26 08:33:56.724	2026-03-26 08:33:56.725	2026-03-26 08:33:56.725
cmn77u9rz00f52pyi3bz5rciz	cmn2ol0ae0000d8dbu2s1mv6u	UPDATE_CLIENT	Updated details for client: ABC Enterprises	\N	ABC Enterprises	\N	\N	\N	2026-03-26 08:33:56.734	2026-03-26 08:33:56.735	2026-03-26 08:33:56.735
cmn8gqggc000fuvl4le40dqy1	cmn2ol0ae0000d8dbu2s1mv6u	UPLOAD_FILE	Uploaded file: MetaAdWorks Leads - total clients.pdf	cmn8f0ld500011prngxd0ftqg	\N	cmn8gqgdx000duvl4yvku6t59	\N	\N	2026-03-27 05:30:41.481	2026-03-27 05:30:41.483	2026-03-27 05:30:41.483
cmn8h90pe000kuvl4bxxr1ahp	cmn2ol0ae0000d8dbu2s1mv6u	CREATE_FOLDER	Created folder: Untitled Folder	cmn8f0ld500011prngxd0ftqg	\N	\N	cmn8h90o8000iuvl4ifdyczi0	\N	2026-03-27 05:45:07.536	2026-03-27 05:45:07.538	2026-03-27 05:45:07.538
cmn8i70a7000nuvl49hk9wuup	cmn2ol0ae0000d8dbu2s1mv6u	UPLOAD_FILE	Uploaded file: MetaAdWorks Leads - total clients.pdf	cmn8f0ld500011prngxd0ftqg	\N	cmn8i708b000luvl4bvz11u40	\N	\N	2026-03-27 06:11:33.293	2026-03-27 06:11:33.294	2026-03-27 06:11:33.294
cmn8iezoy0002dcg2kyl6e39n	cmn2ol0ae0000d8dbu2s1mv6u	UPLOAD_FILE	Uploaded file: error_report.xlsx	cmn8f0ld500011prngxd0ftqg	\N	cmn8ieznu0000dcg2frciuove	\N	\N	2026-03-27 06:17:45.776	2026-03-27 06:17:45.778	2026-03-27 06:17:45.778
cmn8inr2g0007dcg2sk92i86v	cmn2ol0ae0000d8dbu2s1mv6u	UPLOAD_FILE	Uploaded file: Client_template (17).xlsx	cmn8f0ld500011prngxd0ftqg	\N	cmn8inr0b0005dcg2530yjswa	\N	\N	2026-03-27 06:24:34.503	2026-03-27 06:24:34.504	2026-03-27 06:24:34.504
cmn8ithit00023t8cc5xmeiry	cmn2ol0ae0000d8dbu2s1mv6u	UPLOAD_FILE	Uploaded file: WhatsApp Image 2026-03-26 at 11.43.54 AM (1).jpeg	cmn8f0ld500011prngxd0ftqg	\N	cmn8ithhd00003t8c8rclrq17	\N	\N	2026-03-27 06:29:02.068	2026-03-27 06:29:02.069	2026-03-27 06:29:02.069
cmn8itx8r00073t8cwcn4zgyj	cmn2ol0ae0000d8dbu2s1mv6u	UPLOAD_FILE	Uploaded file: WhatsApp Image 2026-03-26 at 11.43.53 AM (2).jpeg	cmn8f0ld500011prngxd0ftqg	\N	cmn8itx8e00053t8ce4debvw5	\N	\N	2026-03-27 06:29:22.442	2026-03-27 06:29:22.443	2026-03-27 06:29:22.443
cmn8iuzlh000c3t8cjae2uu3w	cmn2ol0ae0000d8dbu2s1mv6u	UPLOAD_FILE	Uploaded file: INSTAGRAM TEXT DP BLACK.png	cmn8f0ld500011prngxd0ftqg	\N	cmn8iuzla000a3t8c0n2y41zo	\N	\N	2026-03-27 06:30:12.148	2026-03-27 06:30:12.149	2026-03-27 06:30:12.149
cmn8kggwd0002826p8mxd9tai	cmn2ol0ae0000d8dbu2s1mv6u	UPLOAD_FILE	Uploaded file: error_report.xlsx	cmn8f0ld500011prngxd0ftqg	\N	cmn8kggum0000826pho0kn0n0	\N	\N	2026-03-27 07:14:53.964	2026-03-27 07:14:53.966	2026-03-27 07:14:53.966
cmn8kl9r10006826p9qmjhcm5	cmn2ol0ae0000d8dbu2s1mv6u	DELETE_FILE	Moved file to recycle bin: MetaAdWorks Leads - total clients.pdf	cmn8f0ld500011prngxd0ftqg	\N	cmn8gqgdx000duvl4yvku6t59	\N	\N	2026-03-27 07:18:37.921	2026-03-27 07:18:37.957	2026-03-27 07:18:37.957
\.


--
-- Data for Name: Banner; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Banner" (id, title, "imageUrl", "publicId", "isActive", "order", "caId", "createdAt") FROM stdin;
\.


--
-- Data for Name: Client; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Client" (id, "caId", name, "mobileNumber", "panNumber", "gstNumber", "tanNumber", dob, "fileNumber", type, "customFields", "gstId", "gstPassword", address, "isActive", "deviceId", "deviceStatus", "allowedDevices", "createdAt", "updatedAt", email, "groupName", "tradeName") FROM stdin;
cmn8ermhw0001g0tv2tsvykws	cmn2ol0ae0000d8dbu2s1mv6u	kirtan narola	9432167890	ABCDE1234D	\N	1234567890	\N	7	INDIVIDUAL	\N	\N	\N	sikshapatri heights , kosad , amroli	t	\N	PENDING	\N	2026-03-27 04:35:36.732	2026-03-27 04:35:36.732	pv@gmail.com		\N
cmn8f0ld500011prngxd0ftqg	cmn2ol0ae0000d8dbu2s1mv6u	Kriyona Infotech	9876543210	ABCDE1234I	27ABCDE1234I1Z5	1234567890	2026-03-01 18:30:00	8	BUSINESS	\N	\N	\N	\N	t	\N	PENDING	\N	2026-03-27 04:42:35.176	2026-03-27 04:42:35.176	kriyonainfotech@gmail.com		\N
\.


--
-- Data for Name: Document; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Document" (id, "clientId", "folderId", "fileName", "fileUrl", "cloudinaryId", "fileType", "fileSize", "uploadedBy", category, "isDeleted", "deletedAt", "deletedBy", "createdAt", "updatedAt", "documentNumber", "displayName") FROM stdin;
cmn8ithhd00003t8c8rclrq17	cmn8f0ld500011prngxd0ftqg	cmn8f0m0v00771prnbmc71202	WhatsApp Image 2026-03-26 at 11.43.54 AM (1).jpeg	http://217.217.250.162:9000/ca-cmn2ol0ae0000d8dbu2s1mv6u/client_cmn8f0ld500011prngxd0ftqg/gst/1774592941946-WhatsApp Image 2026-03-26 at 11.43.54 AM (1).jpeg	client_cmn8f0ld500011prngxd0ftqg/gst/1774592941946-WhatsApp Image 2026-03-26 at 11.43.54 AM (1).jpeg	image/jpeg	75976	CA	GST	f	\N	\N	2026-03-27 06:29:02.017	2026-03-27 06:29:02.017	\N	WhatsApp Image 2026-03-26 at 11.43.54 AM (1).jpeg
cmn8iuzla000a3t8c0n2y41zo	cmn8f0ld500011prngxd0ftqg	cmn8f0m0v00771prnbmc71202	INSTAGRAM TEXT DP BLACK.png	http://217.217.250.162:9000/ca-cmn2ol0ae0000d8dbu2s1mv6u/client_cmn8f0ld500011prngxd0ftqg/gst/1774593009608-INSTAGRAM TEXT DP BLACK.png	client_cmn8f0ld500011prngxd0ftqg/gst/1774593009608-INSTAGRAM TEXT DP BLACK.png	image/png	21807588	CA	GST	f	\N	\N	2026-03-27 06:30:12.142	2026-03-27 06:30:12.142	\N	INSTAGRAM TEXT DP BLACK.png
cmn8gqgdx000duvl4yvku6t59	cmn8f0ld500011prngxd0ftqg	cmn8f0m11007b1prnfumvb6oi	MetaAdWorks Leads - total clients.pdf	http://217.217.250.162:9000/ca-cmn2ol0ae0000d8dbu2s1mv6u/client_cmn8f0ld500011prngxd0ftqg/gst/1774589441324-MetaAdWorks Leads - total clients.pdf	client_cmn8f0ld500011prngxd0ftqg/gst/1774589441324-MetaAdWorks Leads - total clients.pdf	application/pdf	148914	CA	GST	t	2026-03-27 07:18:37.812	cmn2ol0ae0000d8dbu2s1mv6u	2026-03-27 05:30:41.396	2026-03-27 07:18:37.83	\N	MetaAdWorks Leads - total clients.pdf
cmn8i708b000luvl4bvz11u40	cmn8f0ld500011prngxd0ftqg	cmn8f0m0v00771prnbmc71202	MetaAdWorks Leads - total clients.pdf	http://217.217.250.162:9000/ca-cmn2ol0ae0000d8dbu2s1mv6u/client_cmn8f0ld500011prngxd0ftqg/gst/1774591893156-MetaAdWorks Leads - total clients.pdf	client_cmn8f0ld500011prngxd0ftqg/gst/1774591893156-MetaAdWorks Leads - total clients.pdf	application/pdf	148914	CA	GST	f	\N	\N	2026-03-27 06:11:33.227	2026-03-27 06:11:33.227	\N	MetaAdWorks Leads - total clients.pdf
cmn8itx8e00053t8ce4debvw5	cmn8f0ld500011prngxd0ftqg	cmn8f0m0v00771prnbmc71202	WhatsApp Image 2026-03-26 at 11.43.53 AM (2).jpeg	http://217.217.250.162:9000/ca-cmn2ol0ae0000d8dbu2s1mv6u/client_cmn8f0ld500011prngxd0ftqg/gst/1774592962347-WhatsApp Image 2026-03-26 at 11.43.53 AM (2).jpeg	client_cmn8f0ld500011prngxd0ftqg/gst/1774592962347-WhatsApp Image 2026-03-26 at 11.43.53 AM (2).jpeg	image/jpeg	152737	CA	GST	f	\N	\N	2026-03-27 06:29:22.43	2026-03-27 06:29:22.43	\N	WhatsApp Image 2026-03-26 at 11.43.53 AM (2).jpeg
cmn8ieznu0000dcg2frciuove	cmn8f0ld500011prngxd0ftqg	cmn8f0m0v00771prnbmc71202	error_report.xlsx	http://217.217.250.162:9000/ca-cmn2ol0ae0000d8dbu2s1mv6u/client_cmn8f0ld500011prngxd0ftqg/gst/1774592265702-error_report.xlsx	client_cmn8f0ld500011prngxd0ftqg/gst/1774592265702-error_report.xlsx	application/vnd.openxmlformats-officedocument.spreadsheetml.sheet	15983	CA	GST	f	\N	\N	2026-03-27 06:17:45.738	2026-03-27 06:17:45.738	\N	error_report.xlsx
cmn8kggum0000826pho0kn0n0	cmn8f0ld500011prngxd0ftqg	cmn8f0m0q00751prngj7dnx8v	error_report.xlsx	http://217.217.250.162:9000/ca-cmn2ol0ae0000d8dbu2s1mv6u/client_cmn8f0ld500011prngxd0ftqg/gst/1774595693859-error_report.xlsx	client_cmn8f0ld500011prngxd0ftqg/gst/1774595693859-error_report.xlsx	application/vnd.openxmlformats-officedocument.spreadsheetml.sheet	15983	CA	GST	f	\N	\N	2026-03-27 07:14:53.901	2026-03-27 07:14:53.901	\N	error_report.xlsx
cmn8inr0b0005dcg2530yjswa	cmn8f0ld500011prngxd0ftqg	cmn8f0m0v00771prnbmc71202	Client_template (17).xlsx	http://217.217.250.162:9000/ca-cmn2ol0ae0000d8dbu2s1mv6u/client_cmn8f0ld500011prngxd0ftqg/gst/1774592674390-Client_template (17).xlsx	client_cmn8f0ld500011prngxd0ftqg/gst/1774592674390-Client_template (17).xlsx	application/vnd.openxmlformats-officedocument.spreadsheetml.sheet	16864	CA	GST	f	\N	\N	2026-03-27 06:24:34.427	2026-03-27 06:24:34.427	\N	Client_template (17).xlsx
cmn8ermp60004g0tv7ps42g8d	cmn8ermhw0001g0tv2tsvykws	cmn8ermoo0003g0tvfdsmf5ky	Pan Card			\N	0	CA	KYC	f	\N	\N	2026-03-27 04:35:37.002	2026-03-27 04:35:37.002	\N	\N
cmn8ermp60005g0tv1lv9q5fd	cmn8ermhw0001g0tv2tsvykws	cmn8ermoo0003g0tvfdsmf5ky	Adhar card			\N	0	CA	KYC	f	\N	\N	2026-03-27 04:35:37.002	2026-03-27 04:35:37.002	\N	\N
cmn8ermp60006g0tvhazbeh5o	cmn8ermhw0001g0tv2tsvykws	cmn8ermoo0003g0tvfdsmf5ky	Udyam number			\N	0	CA	KYC	f	\N	\N	2026-03-27 04:35:37.002	2026-03-27 04:35:37.002	\N	\N
cmn8ermp60007g0tv7qmd8v41	cmn8ermhw0001g0tv2tsvykws	cmn8ermoo0003g0tvfdsmf5ky	IEC code			\N	0	CA	KYC	f	\N	\N	2026-03-27 04:35:37.002	2026-03-27 04:35:37.002	\N	\N
cmn8ermp60008g0tvcyrehr8k	cmn8ermhw0001g0tv2tsvykws	cmn8ermoo0003g0tvfdsmf5ky	GST registration			\N	0	CA	KYC	f	\N	\N	2026-03-27 04:35:37.002	2026-03-27 04:35:37.002	\N	\N
cmn8ermp60009g0tv1to5neq2	cmn8ermhw0001g0tv2tsvykws	cmn8ermoo0003g0tvfdsmf5ky	Passport			\N	0	CA	KYC	f	\N	\N	2026-03-27 04:35:37.002	2026-03-27 04:35:37.002	\N	\N
cmn8ermp6000ag0tvf7lqh6st	cmn8ermhw0001g0tv2tsvykws	cmn8ermoo0003g0tvfdsmf5ky	Patnership doc			\N	0	CA	KYC	f	\N	\N	2026-03-27 04:35:37.002	2026-03-27 04:35:37.002	\N	\N
cmn8ermp6000bg0tvqkzwn05v	cmn8ermhw0001g0tv2tsvykws	cmn8ermoo0003g0tvfdsmf5ky	Address proof			\N	0	CA	KYC	f	\N	\N	2026-03-27 04:35:37.002	2026-03-27 04:35:37.002	\N	\N
cmn8f0lgj00041prnkxmc6ihl	cmn8f0ld500011prngxd0ftqg	cmn8f0lfs00031prnttx48yyp	Pan Card			\N	0	CA	KYC	f	\N	\N	2026-03-27 04:42:35.299	2026-03-27 04:42:35.299	\N	\N
cmn8f0lgj00051prnb11631zv	cmn8f0ld500011prngxd0ftqg	cmn8f0lfs00031prnttx48yyp	Adhar card			\N	0	CA	KYC	f	\N	\N	2026-03-27 04:42:35.299	2026-03-27 04:42:35.299	\N	\N
cmn8f0lgj00061prnjq931uqm	cmn8f0ld500011prngxd0ftqg	cmn8f0lfs00031prnttx48yyp	Udyam number			\N	0	CA	KYC	f	\N	\N	2026-03-27 04:42:35.299	2026-03-27 04:42:35.299	\N	\N
cmn8f0lgj00071prnz8wnmt6f	cmn8f0ld500011prngxd0ftqg	cmn8f0lfs00031prnttx48yyp	IEC code			\N	0	CA	KYC	f	\N	\N	2026-03-27 04:42:35.299	2026-03-27 04:42:35.299	\N	\N
cmn8f0lgj00081prn8n19apwb	cmn8f0ld500011prngxd0ftqg	cmn8f0lfs00031prnttx48yyp	GST registration			\N	0	CA	KYC	f	\N	\N	2026-03-27 04:42:35.299	2026-03-27 04:42:35.299	\N	\N
cmn8f0lgj00091prn7fx4x9yh	cmn8f0ld500011prngxd0ftqg	cmn8f0lfs00031prnttx48yyp	Passport			\N	0	CA	KYC	f	\N	\N	2026-03-27 04:42:35.299	2026-03-27 04:42:35.299	\N	\N
cmn8f0lgj000a1prn2ed8pp9m	cmn8f0ld500011prngxd0ftqg	cmn8f0lfs00031prnttx48yyp	Patnership doc			\N	0	CA	KYC	f	\N	\N	2026-03-27 04:42:35.299	2026-03-27 04:42:35.299	\N	\N
cmn8f0lgj000b1prn9nxv5gd1	cmn8f0ld500011prngxd0ftqg	cmn8f0lfs00031prnttx48yyp	Address proof			\N	0	CA	KYC	f	\N	\N	2026-03-27 04:42:35.299	2026-03-27 04:42:35.299	\N	\N
cmn8fifo80000uvl4x2anrxez	cmn8f0ld500011prngxd0ftqg	cmn8f0m0q00751prngj7dnx8v	error_report.xlsx	http://217.217.250.162:9000/ca-cmn2ol0ae0000d8dbu2s1mv6u/client_cmn8f0ld500011prngxd0ftqg/gst/1774587387574-error_report.xlsx	client_cmn8f0ld500011prngxd0ftqg/gst/1774587387574-error_report.xlsx	application/vnd.openxmlformats-officedocument.spreadsheetml.sheet	15983	CA	GST	f	\N	\N	2026-03-27 04:56:27.608	2026-03-27 04:56:27.608	\N	error_report.xlsx
\.


--
-- Data for Name: FAQ; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."FAQ" (id, question, answer, audience, "order", "createdAt", "updatedAt") FROM stdin;
cmn81k4o60005eyq3l06eqtin	How to reset a client's password?	Go to Client Management, select the client, and click 'Reset' in the Security tab. They will receive a link via email.	ca	1	2026-03-26 22:25:52.038	2026-03-26 22:25:52.038
cmn81k4o60006eyq3qtudi3se	What is the maximum file size for uploads?	You can upload files up to 100MB each. For larger files, please contact support.	ca	2	2026-03-26 22:25:52.038	2026-03-26 22:25:52.038
cmn81k4oa0007eyq36y15wp6x	How do I know my taxes are filed?	You'll receive an automated notification and the acknowledgement PDF will be available in your 'Tax Returns' folder.	client	1	2026-03-26 22:25:52.042	2026-03-26 22:25:52.042
cmn81k4oa0008eyq3zzg38rl7	Can I upload docs from my mobile?	Yes! Our site is mobile-responsive. You can snap a photo of a document or upload a PDF directly from your phone.	client	2	2026-03-26 22:25:52.042	2026-03-26 22:25:52.042
cmn8ht8tj00054hxjnpuo59ez	How to reset a client's password?	Go to Client Management, select the client, and click 'Reset' in the Security tab. They will receive a link via email.	ca	1	2026-03-27 06:00:51.176	2026-03-27 06:00:51.176
cmn8ht8tj00064hxj3mj7avfi	What is the maximum file size for uploads?	You can upload files up to 100MB each. For larger files, please contact support.	ca	2	2026-03-27 06:00:51.176	2026-03-27 06:00:51.176
cmn8ht8tq00074hxjt58czrfs	How do I know my taxes are filed?	You'll receive an automated notification and the acknowledgement PDF will be available in your 'Tax Returns' folder.	client	1	2026-03-27 06:00:51.182	2026-03-27 06:00:51.182
cmn8ht8tq00084hxj75uhg2qe	Can I upload docs from my mobile?	Yes! Our site is mobile-responsive. You can snap a photo of a document or upload a PDF directly from your phone.	client	2	2026-03-27 06:00:51.182	2026-03-27 06:00:51.182
\.


--
-- Data for Name: Folder; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Folder" (id, name, "clientId", category, "parentFolderId", path, "isDeleted", "deletedAt", "deletedBy", "createdAt", "updatedAt", "isPredefined") FROM stdin;
cmn8h90o8000iuvl4ifdyczi0	Untitled Folder	cmn8f0ld500011prngxd0ftqg	GST	cmn8f0m11007b1prnfumvb6oi	[{"id": "cmn8f0lzz006t1prnxttn91dd", "name": "FY - 2025-26"}, {"id": "cmn8f0m0h00711prnf4qaw4rq", "name": "GST"}, {"id": "cmn8f0m0y00791prnagwzvji6", "name": "2-MAY"}, {"id": "cmn8f0m11007b1prnfumvb6oi", "name": "Sale Bill"}]	f	\N	\N	2026-03-27 05:45:07.496	2026-03-27 06:10:37.257	f
cmn8ermsj000ng0tv2ob70iqu	Q1 - APR-JUN	cmn8ermhw0001g0tv2tsvykws	TDS	cmn8ermsb000lg0tvn9l3c1zd	[{"id": "cmn8ermr0000dg0tv6srfkzja", "name": "FY - 2023-24"}, {"id": "cmn8ermsb000lg0tvn9l3c1zd", "name": "TDS"}]	f	\N	\N	2026-03-27 04:35:37.123	2026-03-27 04:35:37.123	t
cmn8ermsr000pg0tvt54wpbaf	Q2 - JUL-SEP	cmn8ermhw0001g0tv2tsvykws	TDS	cmn8ermsb000lg0tvn9l3c1zd	[{"id": "cmn8ermr0000dg0tv6srfkzja", "name": "FY - 2023-24"}, {"id": "cmn8ermsb000lg0tvn9l3c1zd", "name": "TDS"}]	f	\N	\N	2026-03-27 04:35:37.131	2026-03-27 04:35:37.131	t
cmn8ermsy000rg0tv2avpx4i1	Q3 - OCT-DEC	cmn8ermhw0001g0tv2tsvykws	TDS	cmn8ermsb000lg0tvn9l3c1zd	[{"id": "cmn8ermr0000dg0tv6srfkzja", "name": "FY - 2023-24"}, {"id": "cmn8ermsb000lg0tvn9l3c1zd", "name": "TDS"}]	f	\N	\N	2026-03-27 04:35:37.138	2026-03-27 04:35:37.138	t
cmn8ermtd000tg0tvivylwew6	Q4 - JAN-MAR	cmn8ermhw0001g0tv2tsvykws	TDS	cmn8ermsb000lg0tvn9l3c1zd	[{"id": "cmn8ermr0000dg0tv6srfkzja", "name": "FY - 2023-24"}, {"id": "cmn8ermsb000lg0tvn9l3c1zd", "name": "TDS"}]	f	\N	\N	2026-03-27 04:35:37.153	2026-03-27 04:35:37.153	t
cmn8ermtn000vg0tv4oncxo1z	FY - 2024-25	cmn8ermhw0001g0tv2tsvykws	GENERAL	\N	[]	f	\N	\N	2026-03-27 04:35:37.163	2026-03-27 04:35:37.163	t
cmn8ermtz000xg0tvty1m8i85	ITR	cmn8ermhw0001g0tv2tsvykws	ITR	cmn8ermtn000vg0tv4oncxo1z	[{"id": "cmn8ermtn000vg0tv4oncxo1z", "name": "FY - 2024-25"}]	f	\N	\N	2026-03-27 04:35:37.175	2026-03-27 04:35:37.175	t
cmn8ermua000zg0tvkd8ycgmq	Income Tax Return	cmn8ermhw0001g0tv2tsvykws	ITR	cmn8ermtz000xg0tvty1m8i85	[{"id": "cmn8ermtn000vg0tv4oncxo1z", "name": "FY - 2024-25"}, {"id": "cmn8ermtz000xg0tvty1m8i85", "name": "ITR"}]	f	\N	\N	2026-03-27 04:35:37.186	2026-03-27 04:35:37.186	t
cmn8ermum0011g0tvl4gu9out	Bank statement	cmn8ermhw0001g0tv2tsvykws	ITR	cmn8ermtz000xg0tvty1m8i85	[{"id": "cmn8ermtn000vg0tv4oncxo1z", "name": "FY - 2024-25"}, {"id": "cmn8ermtz000xg0tvty1m8i85", "name": "ITR"}]	f	\N	\N	2026-03-27 04:35:37.198	2026-03-27 04:35:37.198	t
cmn8ermuu0013g0tv3ft1utn0	TDS	cmn8ermhw0001g0tv2tsvykws	TDS	cmn8ermtn000vg0tv4oncxo1z	[{"id": "cmn8ermtn000vg0tv4oncxo1z", "name": "FY - 2024-25"}]	f	\N	\N	2026-03-27 04:35:37.206	2026-03-27 04:35:37.206	t
cmn8ermv50015g0tvjhtc4pok	Q1 - APR-JUN	cmn8ermhw0001g0tv2tsvykws	TDS	cmn8ermuu0013g0tv3ft1utn0	[{"id": "cmn8ermtn000vg0tv4oncxo1z", "name": "FY - 2024-25"}, {"id": "cmn8ermuu0013g0tv3ft1utn0", "name": "TDS"}]	f	\N	\N	2026-03-27 04:35:37.217	2026-03-27 04:35:37.217	t
cmn8ermvg0017g0tvvzohsezy	Q2 - JUL-SEP	cmn8ermhw0001g0tv2tsvykws	TDS	cmn8ermuu0013g0tv3ft1utn0	[{"id": "cmn8ermtn000vg0tv4oncxo1z", "name": "FY - 2024-25"}, {"id": "cmn8ermuu0013g0tv3ft1utn0", "name": "TDS"}]	f	\N	\N	2026-03-27 04:35:37.228	2026-03-27 04:35:37.228	t
cmn8f0lm1001x1prnrdbynaat	Purchase Bill	cmn8f0ld500011prngxd0ftqg	GST	cmn8f0llm001t1prnv6pcqmdh	[{"id": "cmn8f0lgx000d1prngugnc6qh", "name": "FY - 2023-24"}, {"id": "cmn8f0lhg000l1prne6mh076c", "name": "GST"}, {"id": "cmn8f0llm001t1prnv6pcqmdh", "name": "8-NOVEMBER"}]	f	\N	\N	2026-03-27 04:42:35.498	2026-03-27 04:42:35.498	t
cmn8ermvm0019g0tvsvpc28rp	Q3 - OCT-DEC	cmn8ermhw0001g0tv2tsvykws	TDS	cmn8ermuu0013g0tv3ft1utn0	[{"id": "cmn8ermtn000vg0tv4oncxo1z", "name": "FY - 2024-25"}, {"id": "cmn8ermuu0013g0tv3ft1utn0", "name": "TDS"}]	f	\N	\N	2026-03-27 04:35:37.234	2026-03-27 04:35:37.234	t
cmn8ermvy001bg0tvztcb6na8	Q4 - JAN-MAR	cmn8ermhw0001g0tv2tsvykws	TDS	cmn8ermuu0013g0tv3ft1utn0	[{"id": "cmn8ermtn000vg0tv4oncxo1z", "name": "FY - 2024-25"}, {"id": "cmn8ermuu0013g0tv3ft1utn0", "name": "TDS"}]	f	\N	\N	2026-03-27 04:35:37.246	2026-03-27 04:35:37.246	t
cmn8ermw5001dg0tv9nggxgyw	FY - 2025-26	cmn8ermhw0001g0tv2tsvykws	GENERAL	\N	[]	f	\N	\N	2026-03-27 04:35:37.253	2026-03-27 04:35:37.253	t
cmn8ermwb001fg0tvhbcghiet	ITR	cmn8ermhw0001g0tv2tsvykws	ITR	cmn8ermw5001dg0tv9nggxgyw	[{"id": "cmn8ermw5001dg0tv9nggxgyw", "name": "FY - 2025-26"}]	f	\N	\N	2026-03-27 04:35:37.259	2026-03-27 04:35:37.259	t
cmn8ermwm001hg0tvr6u64sz1	Income Tax Return	cmn8ermhw0001g0tv2tsvykws	ITR	cmn8ermwb001fg0tvhbcghiet	[{"id": "cmn8ermw5001dg0tv9nggxgyw", "name": "FY - 2025-26"}, {"id": "cmn8ermwb001fg0tvhbcghiet", "name": "ITR"}]	f	\N	\N	2026-03-27 04:35:37.27	2026-03-27 04:35:37.27	t
cmn8ermwy001jg0tvt1ero2sr	Bank statement	cmn8ermhw0001g0tv2tsvykws	ITR	cmn8ermwb001fg0tvhbcghiet	[{"id": "cmn8ermw5001dg0tv9nggxgyw", "name": "FY - 2025-26"}, {"id": "cmn8ermwb001fg0tvhbcghiet", "name": "ITR"}]	f	\N	\N	2026-03-27 04:35:37.282	2026-03-27 04:35:37.282	t
cmn8ermx8001lg0tvhpt9kcgh	TDS	cmn8ermhw0001g0tv2tsvykws	TDS	cmn8ermw5001dg0tv9nggxgyw	[{"id": "cmn8ermw5001dg0tv9nggxgyw", "name": "FY - 2025-26"}]	f	\N	\N	2026-03-27 04:35:37.292	2026-03-27 04:35:37.292	t
cmn8ermxs001pg0tvkvhvnwpx	Q2 - JUL-SEP	cmn8ermhw0001g0tv2tsvykws	TDS	cmn8ermx8001lg0tvhpt9kcgh	[{"id": "cmn8ermw5001dg0tv9nggxgyw", "name": "FY - 2025-26"}, {"id": "cmn8ermx8001lg0tvhpt9kcgh", "name": "TDS"}]	f	\N	\N	2026-03-27 04:35:37.312	2026-03-27 04:35:37.312	t
cmn8ermy0001rg0tvenwkkhcq	Q3 - OCT-DEC	cmn8ermhw0001g0tv2tsvykws	TDS	cmn8ermx8001lg0tvhpt9kcgh	[{"id": "cmn8ermw5001dg0tv9nggxgyw", "name": "FY - 2025-26"}, {"id": "cmn8ermx8001lg0tvhpt9kcgh", "name": "TDS"}]	f	\N	\N	2026-03-27 04:35:37.32	2026-03-27 04:35:37.32	t
cmn8ermyb001tg0tv85g6nk3l	Q4 - JAN-MAR	cmn8ermhw0001g0tv2tsvykws	TDS	cmn8ermx8001lg0tvhpt9kcgh	[{"id": "cmn8ermw5001dg0tv9nggxgyw", "name": "FY - 2025-26"}, {"id": "cmn8ermx8001lg0tvhpt9kcgh", "name": "TDS"}]	f	\N	\N	2026-03-27 04:35:37.331	2026-03-27 04:35:37.331	t
cmn8f0lm7001z1prnm5hbvr0a	9-DECEMBER	cmn8f0ld500011prngxd0ftqg	GST	cmn8f0lhg000l1prne6mh076c	[{"id": "cmn8f0lgx000d1prngugnc6qh", "name": "FY - 2023-24"}, {"id": "cmn8f0lhg000l1prne6mh076c", "name": "GST"}]	f	\N	\N	2026-03-27 04:42:35.503	2026-03-27 04:42:35.503	t
cmn8f0lko001j1prnsmtj36es	Sale Bill	cmn8f0ld500011prngxd0ftqg	GST	cmn8f0lkd001h1prnk7kp7obv	[{"id": "cmn8f0lgx000d1prngugnc6qh", "name": "FY - 2023-24"}, {"id": "cmn8f0lhg000l1prne6mh076c", "name": "GST"}, {"id": "cmn8f0lkd001h1prnk7kp7obv", "name": "6-SEPTEMBER"}]	f	\N	\N	2026-03-27 04:42:35.448	2026-03-27 04:42:35.448	t
cmn8f0lks001l1prnjmwxihta	Purchase Bill	cmn8f0ld500011prngxd0ftqg	GST	cmn8f0lkd001h1prnk7kp7obv	[{"id": "cmn8f0lgx000d1prngugnc6qh", "name": "FY - 2023-24"}, {"id": "cmn8f0lhg000l1prne6mh076c", "name": "GST"}, {"id": "cmn8f0lkd001h1prnk7kp7obv", "name": "6-SEPTEMBER"}]	f	\N	\N	2026-03-27 04:42:35.452	2026-03-27 04:42:35.452	t
cmn8f0lky001n1prnv5j7q2bv	7-OCTOBER	cmn8f0ld500011prngxd0ftqg	GST	cmn8f0lhg000l1prne6mh076c	[{"id": "cmn8f0lgx000d1prngugnc6qh", "name": "FY - 2023-24"}, {"id": "cmn8f0lhg000l1prne6mh076c", "name": "GST"}]	f	\N	\N	2026-03-27 04:42:35.458	2026-03-27 04:42:35.458	t
cmn8f0ll6001p1prn9mr8bp9k	Sale Bill	cmn8f0ld500011prngxd0ftqg	GST	cmn8f0lky001n1prnv5j7q2bv	[{"id": "cmn8f0lgx000d1prngugnc6qh", "name": "FY - 2023-24"}, {"id": "cmn8f0lhg000l1prne6mh076c", "name": "GST"}, {"id": "cmn8f0lky001n1prnv5j7q2bv", "name": "7-OCTOBER"}]	f	\N	\N	2026-03-27 04:42:35.466	2026-03-27 04:42:35.466	t
cmn8f0lld001r1prndiyo5m2x	Purchase Bill	cmn8f0ld500011prngxd0ftqg	GST	cmn8f0lky001n1prnv5j7q2bv	[{"id": "cmn8f0lgx000d1prngugnc6qh", "name": "FY - 2023-24"}, {"id": "cmn8f0lhg000l1prne6mh076c", "name": "GST"}, {"id": "cmn8f0lky001n1prnv5j7q2bv", "name": "7-OCTOBER"}]	f	\N	\N	2026-03-27 04:42:35.473	2026-03-27 04:42:35.473	t
cmn8f0llm001t1prnv6pcqmdh	8-NOVEMBER	cmn8f0ld500011prngxd0ftqg	GST	cmn8f0lhg000l1prne6mh076c	[{"id": "cmn8f0lgx000d1prngugnc6qh", "name": "FY - 2023-24"}, {"id": "cmn8f0lhg000l1prne6mh076c", "name": "GST"}]	f	\N	\N	2026-03-27 04:42:35.482	2026-03-27 04:42:35.482	t
cmn8f0lls001v1prnk7a9jqr0	Sale Bill	cmn8f0ld500011prngxd0ftqg	GST	cmn8f0llm001t1prnv6pcqmdh	[{"id": "cmn8f0lgx000d1prngugnc6qh", "name": "FY - 2023-24"}, {"id": "cmn8f0lhg000l1prne6mh076c", "name": "GST"}, {"id": "cmn8f0llm001t1prnv6pcqmdh", "name": "8-NOVEMBER"}]	f	\N	\N	2026-03-27 04:42:35.488	2026-03-27 04:42:35.488	t
cmn8f0lmg00211prn573gwlrh	Sale Bill	cmn8f0ld500011prngxd0ftqg	GST	cmn8f0lm7001z1prnm5hbvr0a	[{"id": "cmn8f0lgx000d1prngugnc6qh", "name": "FY - 2023-24"}, {"id": "cmn8f0lhg000l1prne6mh076c", "name": "GST"}, {"id": "cmn8f0lm7001z1prnm5hbvr0a", "name": "9-DECEMBER"}]	f	\N	\N	2026-03-27 04:42:35.512	2026-03-27 04:42:35.512	t
cmn8f0lmm00231prncq3i1n2b	Purchase Bill	cmn8f0ld500011prngxd0ftqg	GST	cmn8f0lm7001z1prnm5hbvr0a	[{"id": "cmn8f0lgx000d1prngugnc6qh", "name": "FY - 2023-24"}, {"id": "cmn8f0lhg000l1prne6mh076c", "name": "GST"}, {"id": "cmn8f0lm7001z1prnm5hbvr0a", "name": "9-DECEMBER"}]	f	\N	\N	2026-03-27 04:42:35.518	2026-03-27 04:42:35.518	t
cmn8f0lms00251prnlq2tgon9	10-JANUARY	cmn8f0ld500011prngxd0ftqg	GST	cmn8f0lhg000l1prne6mh076c	[{"id": "cmn8f0lgx000d1prngugnc6qh", "name": "FY - 2023-24"}, {"id": "cmn8f0lhg000l1prne6mh076c", "name": "GST"}]	f	\N	\N	2026-03-27 04:42:35.524	2026-03-27 04:42:35.524	t
cmn8f0liq000z1prn4ahp5x36	3-JUNE	cmn8f0ld500011prngxd0ftqg	GST	cmn8f0lhg000l1prne6mh076c	[{"id": "cmn8f0lgx000d1prngugnc6qh", "name": "FY - 2023-24"}, {"id": "cmn8f0lhg000l1prne6mh076c", "name": "GST"}]	f	\N	\N	2026-03-27 04:42:35.378	2026-03-27 04:42:35.378	t
cmn8f0liw00111prn6wekn4nv	Sale Bill	cmn8f0ld500011prngxd0ftqg	GST	cmn8f0liq000z1prn4ahp5x36	[{"id": "cmn8f0lgx000d1prngugnc6qh", "name": "FY - 2023-24"}, {"id": "cmn8f0lhg000l1prne6mh076c", "name": "GST"}, {"id": "cmn8f0liq000z1prn4ahp5x36", "name": "3-JUNE"}]	f	\N	\N	2026-03-27 04:42:35.385	2026-03-27 04:42:35.385	t
cmn8f0lj100131prnq1rbntnt	Purchase Bill	cmn8f0ld500011prngxd0ftqg	GST	cmn8f0liq000z1prn4ahp5x36	[{"id": "cmn8f0lgx000d1prngugnc6qh", "name": "FY - 2023-24"}, {"id": "cmn8f0lhg000l1prne6mh076c", "name": "GST"}, {"id": "cmn8f0liq000z1prn4ahp5x36", "name": "3-JUNE"}]	f	\N	\N	2026-03-27 04:42:35.39	2026-03-27 04:42:35.39	t
cmn8f0lja00151prngi9offso	4-JULY	cmn8f0ld500011prngxd0ftqg	GST	cmn8f0lhg000l1prne6mh076c	[{"id": "cmn8f0lgx000d1prngugnc6qh", "name": "FY - 2023-24"}, {"id": "cmn8f0lhg000l1prne6mh076c", "name": "GST"}]	f	\N	\N	2026-03-27 04:42:35.398	2026-03-27 04:42:35.398	t
cmn8f0lje00171prnzjn04i9t	Sale Bill	cmn8f0ld500011prngxd0ftqg	GST	cmn8f0lja00151prngi9offso	[{"id": "cmn8f0lgx000d1prngugnc6qh", "name": "FY - 2023-24"}, {"id": "cmn8f0lhg000l1prne6mh076c", "name": "GST"}, {"id": "cmn8f0lja00151prngi9offso", "name": "4-JULY"}]	f	\N	\N	2026-03-27 04:42:35.402	2026-03-27 04:42:35.402	t
cmn8f0lfs00031prnttx48yyp	KYC DOCUMENT	cmn8f0ld500011prngxd0ftqg	KYC	\N	[]	f	\N	\N	2026-03-27 04:42:35.272	2026-03-27 04:42:35.272	t
cmn8f0lgx000d1prngugnc6qh	FY - 2023-24	cmn8f0ld500011prngxd0ftqg	GENERAL	\N	[]	f	\N	\N	2026-03-27 04:42:35.313	2026-03-27 04:42:35.313	t
cmn8f0lh1000f1prnkirnz34f	ITR	cmn8f0ld500011prngxd0ftqg	ITR	cmn8f0lgx000d1prngugnc6qh	[{"id": "cmn8f0lgx000d1prngugnc6qh", "name": "FY - 2023-24"}]	f	\N	\N	2026-03-27 04:42:35.317	2026-03-27 04:42:35.317	t
cmn8f0lh4000h1prnmgshomjw	Income Tax Return	cmn8f0ld500011prngxd0ftqg	ITR	cmn8f0lh1000f1prnkirnz34f	[{"id": "cmn8f0lgx000d1prngugnc6qh", "name": "FY - 2023-24"}, {"id": "cmn8f0lh1000f1prnkirnz34f", "name": "ITR"}]	f	\N	\N	2026-03-27 04:42:35.32	2026-03-27 04:42:35.32	t
cmn8f0lhd000j1prno0okvbc8	Bank statement	cmn8f0ld500011prngxd0ftqg	ITR	cmn8f0lh1000f1prnkirnz34f	[{"id": "cmn8f0lgx000d1prngugnc6qh", "name": "FY - 2023-24"}, {"id": "cmn8f0lh1000f1prnkirnz34f", "name": "ITR"}]	f	\N	\N	2026-03-27 04:42:35.329	2026-03-27 04:42:35.329	t
cmn8f0lhg000l1prne6mh076c	GST	cmn8f0ld500011prngxd0ftqg	GST	cmn8f0lgx000d1prngugnc6qh	[{"id": "cmn8f0lgx000d1prngugnc6qh", "name": "FY - 2023-24"}]	f	\N	\N	2026-03-27 04:42:35.333	2026-03-27 04:42:35.333	t
cmn8f0lhk000n1prn5k5br0d8	1-APRIL	cmn8f0ld500011prngxd0ftqg	GST	cmn8f0lhg000l1prne6mh076c	[{"id": "cmn8f0lgx000d1prngugnc6qh", "name": "FY - 2023-24"}, {"id": "cmn8f0lhg000l1prne6mh076c", "name": "GST"}]	f	\N	\N	2026-03-27 04:42:35.336	2026-03-27 04:42:35.336	t
cmn8f0lhq000p1prnpf0ihr22	Sale Bill	cmn8f0ld500011prngxd0ftqg	GST	cmn8f0lhk000n1prn5k5br0d8	[{"id": "cmn8f0lgx000d1prngugnc6qh", "name": "FY - 2023-24"}, {"id": "cmn8f0lhg000l1prne6mh076c", "name": "GST"}, {"id": "cmn8f0lhk000n1prn5k5br0d8", "name": "1-APRIL"}]	f	\N	\N	2026-03-27 04:42:35.342	2026-03-27 04:42:35.342	t
cmn8f0lhz000r1prnsr2vq7zg	Purchase Bill	cmn8f0ld500011prngxd0ftqg	GST	cmn8f0lhk000n1prn5k5br0d8	[{"id": "cmn8f0lgx000d1prngugnc6qh", "name": "FY - 2023-24"}, {"id": "cmn8f0lhg000l1prne6mh076c", "name": "GST"}, {"id": "cmn8f0lhk000n1prn5k5br0d8", "name": "1-APRIL"}]	f	\N	\N	2026-03-27 04:42:35.351	2026-03-27 04:42:35.351	t
cmn8f0li5000t1prnpps6sufk	2-MAY	cmn8f0ld500011prngxd0ftqg	GST	cmn8f0lhg000l1prne6mh076c	[{"id": "cmn8f0lgx000d1prngugnc6qh", "name": "FY - 2023-24"}, {"id": "cmn8f0lhg000l1prne6mh076c", "name": "GST"}]	f	\N	\N	2026-03-27 04:42:35.357	2026-03-27 04:42:35.357	t
cmn8f0lie000v1prnvufieyb8	Sale Bill	cmn8f0ld500011prngxd0ftqg	GST	cmn8f0li5000t1prnpps6sufk	[{"id": "cmn8f0lgx000d1prngugnc6qh", "name": "FY - 2023-24"}, {"id": "cmn8f0lhg000l1prne6mh076c", "name": "GST"}, {"id": "cmn8f0li5000t1prnpps6sufk", "name": "2-MAY"}]	f	\N	\N	2026-03-27 04:42:35.366	2026-03-27 04:42:35.366	t
cmn8f0lih000x1prn6bgujzyj	Purchase Bill	cmn8f0ld500011prngxd0ftqg	GST	cmn8f0li5000t1prnpps6sufk	[{"id": "cmn8f0lgx000d1prngugnc6qh", "name": "FY - 2023-24"}, {"id": "cmn8f0lhg000l1prne6mh076c", "name": "GST"}, {"id": "cmn8f0li5000t1prnpps6sufk", "name": "2-MAY"}]	f	\N	\N	2026-03-27 04:42:35.37	2026-03-27 04:42:35.37	t
cmn8f0ljm00191prnlom4lrjk	Purchase Bill	cmn8f0ld500011prngxd0ftqg	GST	cmn8f0lja00151prngi9offso	[{"id": "cmn8f0lgx000d1prngugnc6qh", "name": "FY - 2023-24"}, {"id": "cmn8f0lhg000l1prne6mh076c", "name": "GST"}, {"id": "cmn8f0lja00151prngi9offso", "name": "4-JULY"}]	f	\N	\N	2026-03-27 04:42:35.41	2026-03-27 04:42:35.41	t
cmn8f0lju001b1prn613b9kyy	5-AUGUST	cmn8f0ld500011prngxd0ftqg	GST	cmn8f0lhg000l1prne6mh076c	[{"id": "cmn8f0lgx000d1prngugnc6qh", "name": "FY - 2023-24"}, {"id": "cmn8f0lhg000l1prne6mh076c", "name": "GST"}]	f	\N	\N	2026-03-27 04:42:35.418	2026-03-27 04:42:35.418	t
cmn8f0lk0001d1prnxh14qh5d	Sale Bill	cmn8f0ld500011prngxd0ftqg	GST	cmn8f0lju001b1prn613b9kyy	[{"id": "cmn8f0lgx000d1prngugnc6qh", "name": "FY - 2023-24"}, {"id": "cmn8f0lhg000l1prne6mh076c", "name": "GST"}, {"id": "cmn8f0lju001b1prn613b9kyy", "name": "5-AUGUST"}]	f	\N	\N	2026-03-27 04:42:35.424	2026-03-27 04:42:35.424	t
cmn8f0lk8001f1prnsfzy1u2n	Purchase Bill	cmn8f0ld500011prngxd0ftqg	GST	cmn8f0lju001b1prn613b9kyy	[{"id": "cmn8f0lgx000d1prngugnc6qh", "name": "FY - 2023-24"}, {"id": "cmn8f0lhg000l1prne6mh076c", "name": "GST"}, {"id": "cmn8f0lju001b1prn613b9kyy", "name": "5-AUGUST"}]	f	\N	\N	2026-03-27 04:42:35.432	2026-03-27 04:42:35.432	t
cmn8f0lkd001h1prnk7kp7obv	6-SEPTEMBER	cmn8f0ld500011prngxd0ftqg	GST	cmn8f0lhg000l1prne6mh076c	[{"id": "cmn8f0lgx000d1prngugnc6qh", "name": "FY - 2023-24"}, {"id": "cmn8f0lhg000l1prne6mh076c", "name": "GST"}]	f	\N	\N	2026-03-27 04:42:35.437	2026-03-27 04:42:35.437	t
cmn8ermoo0003g0tvfdsmf5ky	KYC DOCUMENT	cmn8ermhw0001g0tv2tsvykws	KYC	\N	[]	f	\N	\N	2026-03-27 04:35:36.984	2026-03-27 04:35:36.984	t
cmn8ermr0000dg0tv6srfkzja	FY - 2023-24	cmn8ermhw0001g0tv2tsvykws	GENERAL	\N	[]	f	\N	\N	2026-03-27 04:35:37.068	2026-03-27 04:35:37.068	t
cmn8ermrd000fg0tvbxvr7tfa	ITR	cmn8ermhw0001g0tv2tsvykws	ITR	cmn8ermr0000dg0tv6srfkzja	[{"id": "cmn8ermr0000dg0tv6srfkzja", "name": "FY - 2023-24"}]	f	\N	\N	2026-03-27 04:35:37.081	2026-03-27 04:35:37.081	t
cmn8ermrp000hg0tvbabjc3uk	Income Tax Return	cmn8ermhw0001g0tv2tsvykws	ITR	cmn8ermrd000fg0tvbxvr7tfa	[{"id": "cmn8ermr0000dg0tv6srfkzja", "name": "FY - 2023-24"}, {"id": "cmn8ermrd000fg0tvbxvr7tfa", "name": "ITR"}]	f	\N	\N	2026-03-27 04:35:37.093	2026-03-27 04:35:37.093	t
cmn8ermrz000jg0tvmzfdacw8	Bank statement	cmn8ermhw0001g0tv2tsvykws	ITR	cmn8ermrd000fg0tvbxvr7tfa	[{"id": "cmn8ermr0000dg0tv6srfkzja", "name": "FY - 2023-24"}, {"id": "cmn8ermrd000fg0tvbxvr7tfa", "name": "ITR"}]	f	\N	\N	2026-03-27 04:35:37.103	2026-03-27 04:35:37.103	t
cmn8ermsb000lg0tvn9l3c1zd	TDS	cmn8ermhw0001g0tv2tsvykws	TDS	cmn8ermr0000dg0tv6srfkzja	[{"id": "cmn8ermr0000dg0tv6srfkzja", "name": "FY - 2023-24"}]	f	\N	\N	2026-03-27 04:35:37.115	2026-03-27 04:35:37.115	t
cmn8f0ln000271prndwq4yrr2	Sale Bill	cmn8f0ld500011prngxd0ftqg	GST	cmn8f0lms00251prnlq2tgon9	[{"id": "cmn8f0lgx000d1prngugnc6qh", "name": "FY - 2023-24"}, {"id": "cmn8f0lhg000l1prne6mh076c", "name": "GST"}, {"id": "cmn8f0lms00251prnlq2tgon9", "name": "10-JANUARY"}]	f	\N	\N	2026-03-27 04:42:35.532	2026-03-27 04:42:35.532	t
cmn8f0ln800291prnj6ysw75k	Purchase Bill	cmn8f0ld500011prngxd0ftqg	GST	cmn8f0lms00251prnlq2tgon9	[{"id": "cmn8f0lgx000d1prngugnc6qh", "name": "FY - 2023-24"}, {"id": "cmn8f0lhg000l1prne6mh076c", "name": "GST"}, {"id": "cmn8f0lms00251prnlq2tgon9", "name": "10-JANUARY"}]	f	\N	\N	2026-03-27 04:42:35.54	2026-03-27 04:42:35.54	t
cmn8f0lnh002b1prnynp930ru	11-FEBRUARY	cmn8f0ld500011prngxd0ftqg	GST	cmn8f0lhg000l1prne6mh076c	[{"id": "cmn8f0lgx000d1prngugnc6qh", "name": "FY - 2023-24"}, {"id": "cmn8f0lhg000l1prne6mh076c", "name": "GST"}]	f	\N	\N	2026-03-27 04:42:35.55	2026-03-27 04:42:35.55	t
cmn8f0lnl002d1prnpyk5md63	Sale Bill	cmn8f0ld500011prngxd0ftqg	GST	cmn8f0lnh002b1prnynp930ru	[{"id": "cmn8f0lgx000d1prngugnc6qh", "name": "FY - 2023-24"}, {"id": "cmn8f0lhg000l1prne6mh076c", "name": "GST"}, {"id": "cmn8f0lnh002b1prnynp930ru", "name": "11-FEBRUARY"}]	f	\N	\N	2026-03-27 04:42:35.554	2026-03-27 04:42:35.554	t
cmn8f0lnt002f1prny5ir6ug1	Purchase Bill	cmn8f0ld500011prngxd0ftqg	GST	cmn8f0lnh002b1prnynp930ru	[{"id": "cmn8f0lgx000d1prngugnc6qh", "name": "FY - 2023-24"}, {"id": "cmn8f0lhg000l1prne6mh076c", "name": "GST"}, {"id": "cmn8f0lnh002b1prnynp930ru", "name": "11-FEBRUARY"}]	f	\N	\N	2026-03-27 04:42:35.561	2026-03-27 04:42:35.561	t
cmn8f0lnz002h1prnt1dgqwqa	12-MARCH	cmn8f0ld500011prngxd0ftqg	GST	cmn8f0lhg000l1prne6mh076c	[{"id": "cmn8f0lgx000d1prngugnc6qh", "name": "FY - 2023-24"}, {"id": "cmn8f0lhg000l1prne6mh076c", "name": "GST"}]	f	\N	\N	2026-03-27 04:42:35.567	2026-03-27 04:42:35.567	t
cmn8f0lo4002j1prn4n8k7dsk	Sale Bill	cmn8f0ld500011prngxd0ftqg	GST	cmn8f0lnz002h1prnt1dgqwqa	[{"id": "cmn8f0lgx000d1prngugnc6qh", "name": "FY - 2023-24"}, {"id": "cmn8f0lhg000l1prne6mh076c", "name": "GST"}, {"id": "cmn8f0lnz002h1prnt1dgqwqa", "name": "12-MARCH"}]	f	\N	\N	2026-03-27 04:42:35.572	2026-03-27 04:42:35.572	t
cmn8f0lod002l1prnk1j1vj3f	Purchase Bill	cmn8f0ld500011prngxd0ftqg	GST	cmn8f0lnz002h1prnt1dgqwqa	[{"id": "cmn8f0lgx000d1prngugnc6qh", "name": "FY - 2023-24"}, {"id": "cmn8f0lhg000l1prne6mh076c", "name": "GST"}, {"id": "cmn8f0lnz002h1prnt1dgqwqa", "name": "12-MARCH"}]	f	\N	\N	2026-03-27 04:42:35.581	2026-03-27 04:42:35.581	t
cmn8f0loh002n1prnc1bqz2xt	TDS	cmn8f0ld500011prngxd0ftqg	TDS	cmn8f0lgx000d1prngugnc6qh	[{"id": "cmn8f0lgx000d1prngugnc6qh", "name": "FY - 2023-24"}]	f	\N	\N	2026-03-27 04:42:35.585	2026-03-27 04:42:35.585	t
cmn8f0lom002p1prnphtagaaa	Q1 - APR-JUN	cmn8f0ld500011prngxd0ftqg	TDS	cmn8f0loh002n1prnc1bqz2xt	[{"id": "cmn8f0lgx000d1prngugnc6qh", "name": "FY - 2023-24"}, {"id": "cmn8f0loh002n1prnc1bqz2xt", "name": "TDS"}]	f	\N	\N	2026-03-27 04:42:35.59	2026-03-27 04:42:35.59	t
cmn8f0lou002r1prn68oexbtv	April	cmn8f0ld500011prngxd0ftqg	TDS	cmn8f0lom002p1prnphtagaaa	[{"id": "cmn8f0lgx000d1prngugnc6qh", "name": "FY - 2023-24"}, {"id": "cmn8f0loh002n1prnc1bqz2xt", "name": "TDS"}, {"id": "cmn8f0lom002p1prnphtagaaa", "name": "Q1 - APR-JUN"}]	f	\N	\N	2026-03-27 04:42:35.598	2026-03-27 04:42:35.598	t
cmn8f0loy002t1prni4ij4ss1	May	cmn8f0ld500011prngxd0ftqg	TDS	cmn8f0lom002p1prnphtagaaa	[{"id": "cmn8f0lgx000d1prngugnc6qh", "name": "FY - 2023-24"}, {"id": "cmn8f0loh002n1prnc1bqz2xt", "name": "TDS"}, {"id": "cmn8f0lom002p1prnphtagaaa", "name": "Q1 - APR-JUN"}]	f	\N	\N	2026-03-27 04:42:35.602	2026-03-27 04:42:35.602	t
cmn8f0lp4002v1prnc4wjqhwx	June	cmn8f0ld500011prngxd0ftqg	TDS	cmn8f0lom002p1prnphtagaaa	[{"id": "cmn8f0lgx000d1prngugnc6qh", "name": "FY - 2023-24"}, {"id": "cmn8f0loh002n1prnc1bqz2xt", "name": "TDS"}, {"id": "cmn8f0lom002p1prnphtagaaa", "name": "Q1 - APR-JUN"}]	f	\N	\N	2026-03-27 04:42:35.608	2026-03-27 04:42:35.608	t
cmn8f0lpc002x1prno2a8ojul	Q2 - JUL-SEP	cmn8f0ld500011prngxd0ftqg	TDS	cmn8f0loh002n1prnc1bqz2xt	[{"id": "cmn8f0lgx000d1prngugnc6qh", "name": "FY - 2023-24"}, {"id": "cmn8f0loh002n1prnc1bqz2xt", "name": "TDS"}]	f	\N	\N	2026-03-27 04:42:35.616	2026-03-27 04:42:35.616	t
cmn8f0lpf002z1prnhl8xya87	July	cmn8f0ld500011prngxd0ftqg	TDS	cmn8f0lpc002x1prno2a8ojul	[{"id": "cmn8f0lgx000d1prngugnc6qh", "name": "FY - 2023-24"}, {"id": "cmn8f0loh002n1prnc1bqz2xt", "name": "TDS"}, {"id": "cmn8f0lpc002x1prno2a8ojul", "name": "Q2 - JUL-SEP"}]	f	\N	\N	2026-03-27 04:42:35.619	2026-03-27 04:42:35.619	t
cmn8f0lpl00311prngf9ynb8f	August	cmn8f0ld500011prngxd0ftqg	TDS	cmn8f0lpc002x1prno2a8ojul	[{"id": "cmn8f0lgx000d1prngugnc6qh", "name": "FY - 2023-24"}, {"id": "cmn8f0loh002n1prnc1bqz2xt", "name": "TDS"}, {"id": "cmn8f0lpc002x1prno2a8ojul", "name": "Q2 - JUL-SEP"}]	f	\N	\N	2026-03-27 04:42:35.625	2026-03-27 04:42:35.625	t
cmn8f0lps00331prnr4oz4cvi	September	cmn8f0ld500011prngxd0ftqg	TDS	cmn8f0lpc002x1prno2a8ojul	[{"id": "cmn8f0lgx000d1prngugnc6qh", "name": "FY - 2023-24"}, {"id": "cmn8f0loh002n1prnc1bqz2xt", "name": "TDS"}, {"id": "cmn8f0lpc002x1prno2a8ojul", "name": "Q2 - JUL-SEP"}]	f	\N	\N	2026-03-27 04:42:35.632	2026-03-27 04:42:35.632	t
cmn8f0lpx00351prnt2ltisk1	Q3 - OCT-DEC	cmn8f0ld500011prngxd0ftqg	TDS	cmn8f0loh002n1prnc1bqz2xt	[{"id": "cmn8f0lgx000d1prngugnc6qh", "name": "FY - 2023-24"}, {"id": "cmn8f0loh002n1prnc1bqz2xt", "name": "TDS"}]	f	\N	\N	2026-03-27 04:42:35.637	2026-03-27 04:42:35.637	t
cmn8f0lq300371prn02aw9ucf	October	cmn8f0ld500011prngxd0ftqg	TDS	cmn8f0lpx00351prnt2ltisk1	[{"id": "cmn8f0lgx000d1prngugnc6qh", "name": "FY - 2023-24"}, {"id": "cmn8f0loh002n1prnc1bqz2xt", "name": "TDS"}, {"id": "cmn8f0lpx00351prnt2ltisk1", "name": "Q3 - OCT-DEC"}]	f	\N	\N	2026-03-27 04:42:35.643	2026-03-27 04:42:35.643	t
cmn8f0lqa00391prn0mmamtth	November	cmn8f0ld500011prngxd0ftqg	TDS	cmn8f0lpx00351prnt2ltisk1	[{"id": "cmn8f0lgx000d1prngugnc6qh", "name": "FY - 2023-24"}, {"id": "cmn8f0loh002n1prnc1bqz2xt", "name": "TDS"}, {"id": "cmn8f0lpx00351prnt2ltisk1", "name": "Q3 - OCT-DEC"}]	f	\N	\N	2026-03-27 04:42:35.651	2026-03-27 04:42:35.651	t
cmn8f0lqg003b1prnf310tzl0	December	cmn8f0ld500011prngxd0ftqg	TDS	cmn8f0lpx00351prnt2ltisk1	[{"id": "cmn8f0lgx000d1prngugnc6qh", "name": "FY - 2023-24"}, {"id": "cmn8f0loh002n1prnc1bqz2xt", "name": "TDS"}, {"id": "cmn8f0lpx00351prnt2ltisk1", "name": "Q3 - OCT-DEC"}]	f	\N	\N	2026-03-27 04:42:35.656	2026-03-27 04:42:35.656	t
cmn8f0lqo003d1prn2o20uhc2	Q4 - JAN-MAR	cmn8f0ld500011prngxd0ftqg	TDS	cmn8f0loh002n1prnc1bqz2xt	[{"id": "cmn8f0lgx000d1prngugnc6qh", "name": "FY - 2023-24"}, {"id": "cmn8f0loh002n1prnc1bqz2xt", "name": "TDS"}]	f	\N	\N	2026-03-27 04:42:35.664	2026-03-27 04:42:35.664	t
cmn8f0lqr003f1prngg4hs3a0	January	cmn8f0ld500011prngxd0ftqg	TDS	cmn8f0lqo003d1prn2o20uhc2	[{"id": "cmn8f0lgx000d1prngugnc6qh", "name": "FY - 2023-24"}, {"id": "cmn8f0loh002n1prnc1bqz2xt", "name": "TDS"}, {"id": "cmn8f0lqo003d1prn2o20uhc2", "name": "Q4 - JAN-MAR"}]	f	\N	\N	2026-03-27 04:42:35.668	2026-03-27 04:42:35.668	t
cmn8f0lqw003h1prnticpepra	February	cmn8f0ld500011prngxd0ftqg	TDS	cmn8f0lqo003d1prn2o20uhc2	[{"id": "cmn8f0lgx000d1prngugnc6qh", "name": "FY - 2023-24"}, {"id": "cmn8f0loh002n1prnc1bqz2xt", "name": "TDS"}, {"id": "cmn8f0lqo003d1prn2o20uhc2", "name": "Q4 - JAN-MAR"}]	f	\N	\N	2026-03-27 04:42:35.672	2026-03-27 04:42:35.672	t
cmn8f0lr5003j1prnsgw6627p	March	cmn8f0ld500011prngxd0ftqg	TDS	cmn8f0lqo003d1prn2o20uhc2	[{"id": "cmn8f0lgx000d1prngugnc6qh", "name": "FY - 2023-24"}, {"id": "cmn8f0loh002n1prnc1bqz2xt", "name": "TDS"}, {"id": "cmn8f0lqo003d1prn2o20uhc2", "name": "Q4 - JAN-MAR"}]	f	\N	\N	2026-03-27 04:42:35.681	2026-03-27 04:42:35.681	t
cmn8f0lr9003l1prniopow3jh	FY - 2024-25	cmn8f0ld500011prngxd0ftqg	GENERAL	\N	[]	f	\N	\N	2026-03-27 04:42:35.685	2026-03-27 04:42:35.685	t
cmn8f0lrd003n1prns2euav0t	ITR	cmn8f0ld500011prngxd0ftqg	ITR	cmn8f0lr9003l1prniopow3jh	[{"id": "cmn8f0lr9003l1prniopow3jh", "name": "FY - 2024-25"}]	f	\N	\N	2026-03-27 04:42:35.689	2026-03-27 04:42:35.689	t
cmn8f0lri003p1prnraa804rh	Income Tax Return	cmn8f0ld500011prngxd0ftqg	ITR	cmn8f0lrd003n1prns2euav0t	[{"id": "cmn8f0lr9003l1prniopow3jh", "name": "FY - 2024-25"}, {"id": "cmn8f0lrd003n1prns2euav0t", "name": "ITR"}]	f	\N	\N	2026-03-27 04:42:35.695	2026-03-27 04:42:35.695	t
cmn8f0lrp003r1prngj5kf233	Bank statement	cmn8f0ld500011prngxd0ftqg	ITR	cmn8f0lrd003n1prns2euav0t	[{"id": "cmn8f0lr9003l1prniopow3jh", "name": "FY - 2024-25"}, {"id": "cmn8f0lrd003n1prns2euav0t", "name": "ITR"}]	f	\N	\N	2026-03-27 04:42:35.702	2026-03-27 04:42:35.702	t
cmn8f0lrv003t1prnfj8ofdma	GST	cmn8f0ld500011prngxd0ftqg	GST	cmn8f0lr9003l1prniopow3jh	[{"id": "cmn8f0lr9003l1prniopow3jh", "name": "FY - 2024-25"}]	f	\N	\N	2026-03-27 04:42:35.707	2026-03-27 04:42:35.707	t
cmn8f0lsr003v1prnipz7nmld	1-APRIL	cmn8f0ld500011prngxd0ftqg	GST	cmn8f0lrv003t1prnfj8ofdma	[{"id": "cmn8f0lr9003l1prniopow3jh", "name": "FY - 2024-25"}, {"id": "cmn8f0lrv003t1prnfj8ofdma", "name": "GST"}]	f	\N	\N	2026-03-27 04:42:35.739	2026-03-27 04:42:35.739	t
cmn8f0lsz003x1prn439pfxlv	Sale Bill	cmn8f0ld500011prngxd0ftqg	GST	cmn8f0lsr003v1prnipz7nmld	[{"id": "cmn8f0lr9003l1prniopow3jh", "name": "FY - 2024-25"}, {"id": "cmn8f0lrv003t1prnfj8ofdma", "name": "GST"}, {"id": "cmn8f0lsr003v1prnipz7nmld", "name": "1-APRIL"}]	f	\N	\N	2026-03-27 04:42:35.747	2026-03-27 04:42:35.747	t
cmn8f0lt4003z1prnmud2cxr2	Purchase Bill	cmn8f0ld500011prngxd0ftqg	GST	cmn8f0lsr003v1prnipz7nmld	[{"id": "cmn8f0lr9003l1prniopow3jh", "name": "FY - 2024-25"}, {"id": "cmn8f0lrv003t1prnfj8ofdma", "name": "GST"}, {"id": "cmn8f0lsr003v1prnipz7nmld", "name": "1-APRIL"}]	f	\N	\N	2026-03-27 04:42:35.752	2026-03-27 04:42:35.752	t
cmn8f0lt900411prniuut3sdw	2-MAY	cmn8f0ld500011prngxd0ftqg	GST	cmn8f0lrv003t1prnfj8ofdma	[{"id": "cmn8f0lr9003l1prniopow3jh", "name": "FY - 2024-25"}, {"id": "cmn8f0lrv003t1prnfj8ofdma", "name": "GST"}]	f	\N	\N	2026-03-27 04:42:35.757	2026-03-27 04:42:35.757	t
cmn8f0lth00431prnjnnwcla6	Sale Bill	cmn8f0ld500011prngxd0ftqg	GST	cmn8f0lt900411prniuut3sdw	[{"id": "cmn8f0lr9003l1prniopow3jh", "name": "FY - 2024-25"}, {"id": "cmn8f0lrv003t1prnfj8ofdma", "name": "GST"}, {"id": "cmn8f0lt900411prniuut3sdw", "name": "2-MAY"}]	f	\N	\N	2026-03-27 04:42:35.765	2026-03-27 04:42:35.765	t
cmn8f0ltl00451prnv228a4dk	Purchase Bill	cmn8f0ld500011prngxd0ftqg	GST	cmn8f0lt900411prniuut3sdw	[{"id": "cmn8f0lr9003l1prniopow3jh", "name": "FY - 2024-25"}, {"id": "cmn8f0lrv003t1prnfj8ofdma", "name": "GST"}, {"id": "cmn8f0lt900411prniuut3sdw", "name": "2-MAY"}]	f	\N	\N	2026-03-27 04:42:35.77	2026-03-27 04:42:35.77	t
cmn8f0ltt00471prnzp9jkbb6	3-JUNE	cmn8f0ld500011prngxd0ftqg	GST	cmn8f0lrv003t1prnfj8ofdma	[{"id": "cmn8f0lr9003l1prniopow3jh", "name": "FY - 2024-25"}, {"id": "cmn8f0lrv003t1prnfj8ofdma", "name": "GST"}]	f	\N	\N	2026-03-27 04:42:35.777	2026-03-27 04:42:35.777	t
cmn8f0ltz00491prns5poez34	Sale Bill	cmn8f0ld500011prngxd0ftqg	GST	cmn8f0ltt00471prnzp9jkbb6	[{"id": "cmn8f0lr9003l1prniopow3jh", "name": "FY - 2024-25"}, {"id": "cmn8f0lrv003t1prnfj8ofdma", "name": "GST"}, {"id": "cmn8f0ltt00471prnzp9jkbb6", "name": "3-JUNE"}]	f	\N	\N	2026-03-27 04:42:35.784	2026-03-27 04:42:35.784	t
cmn8f0lu3004b1prn9kxsd3q1	Purchase Bill	cmn8f0ld500011prngxd0ftqg	GST	cmn8f0ltt00471prnzp9jkbb6	[{"id": "cmn8f0lr9003l1prniopow3jh", "name": "FY - 2024-25"}, {"id": "cmn8f0lrv003t1prnfj8ofdma", "name": "GST"}, {"id": "cmn8f0ltt00471prnzp9jkbb6", "name": "3-JUNE"}]	f	\N	\N	2026-03-27 04:42:35.788	2026-03-27 04:42:35.788	t
cmn8f0luc004d1prniolf2so9	4-JULY	cmn8f0ld500011prngxd0ftqg	GST	cmn8f0lrv003t1prnfj8ofdma	[{"id": "cmn8f0lr9003l1prniopow3jh", "name": "FY - 2024-25"}, {"id": "cmn8f0lrv003t1prnfj8ofdma", "name": "GST"}]	f	\N	\N	2026-03-27 04:42:35.796	2026-03-27 04:42:35.796	t
cmn8f0lug004f1prnv3tiuu49	Sale Bill	cmn8f0ld500011prngxd0ftqg	GST	cmn8f0luc004d1prniolf2so9	[{"id": "cmn8f0lr9003l1prniopow3jh", "name": "FY - 2024-25"}, {"id": "cmn8f0lrv003t1prnfj8ofdma", "name": "GST"}, {"id": "cmn8f0luc004d1prniolf2so9", "name": "4-JULY"}]	f	\N	\N	2026-03-27 04:42:35.8	2026-03-27 04:42:35.8	t
cmn8f0luj004h1prn2vksx1zn	Purchase Bill	cmn8f0ld500011prngxd0ftqg	GST	cmn8f0luc004d1prniolf2so9	[{"id": "cmn8f0lr9003l1prniopow3jh", "name": "FY - 2024-25"}, {"id": "cmn8f0lrv003t1prnfj8ofdma", "name": "GST"}, {"id": "cmn8f0luc004d1prniolf2so9", "name": "4-JULY"}]	f	\N	\N	2026-03-27 04:42:35.803	2026-03-27 04:42:35.803	t
cmn8f0lup004j1prnzmdup3g4	5-AUGUST	cmn8f0ld500011prngxd0ftqg	GST	cmn8f0lrv003t1prnfj8ofdma	[{"id": "cmn8f0lr9003l1prniopow3jh", "name": "FY - 2024-25"}, {"id": "cmn8f0lrv003t1prnfj8ofdma", "name": "GST"}]	f	\N	\N	2026-03-27 04:42:35.81	2026-03-27 04:42:35.81	t
cmn8f0luv004l1prnydcxl267	Sale Bill	cmn8f0ld500011prngxd0ftqg	GST	cmn8f0lup004j1prnzmdup3g4	[{"id": "cmn8f0lr9003l1prniopow3jh", "name": "FY - 2024-25"}, {"id": "cmn8f0lrv003t1prnfj8ofdma", "name": "GST"}, {"id": "cmn8f0lup004j1prnzmdup3g4", "name": "5-AUGUST"}]	f	\N	\N	2026-03-27 04:42:35.816	2026-03-27 04:42:35.816	t
cmn8f0luz004n1prnr5g9fii4	Purchase Bill	cmn8f0ld500011prngxd0ftqg	GST	cmn8f0lup004j1prnzmdup3g4	[{"id": "cmn8f0lr9003l1prniopow3jh", "name": "FY - 2024-25"}, {"id": "cmn8f0lrv003t1prnfj8ofdma", "name": "GST"}, {"id": "cmn8f0lup004j1prnzmdup3g4", "name": "5-AUGUST"}]	f	\N	\N	2026-03-27 04:42:35.819	2026-03-27 04:42:35.819	t
cmn8f0lv5004p1prnvfetnwpy	6-SEPTEMBER	cmn8f0ld500011prngxd0ftqg	GST	cmn8f0lrv003t1prnfj8ofdma	[{"id": "cmn8f0lr9003l1prniopow3jh", "name": "FY - 2024-25"}, {"id": "cmn8f0lrv003t1prnfj8ofdma", "name": "GST"}]	f	\N	\N	2026-03-27 04:42:35.825	2026-03-27 04:42:35.825	t
cmn8f0lva004r1prnqygrlm2e	Sale Bill	cmn8f0ld500011prngxd0ftqg	GST	cmn8f0lv5004p1prnvfetnwpy	[{"id": "cmn8f0lr9003l1prniopow3jh", "name": "FY - 2024-25"}, {"id": "cmn8f0lrv003t1prnfj8ofdma", "name": "GST"}, {"id": "cmn8f0lv5004p1prnvfetnwpy", "name": "6-SEPTEMBER"}]	f	\N	\N	2026-03-27 04:42:35.831	2026-03-27 04:42:35.831	t
cmn8f0lve004t1prn3pz3i90w	Purchase Bill	cmn8f0ld500011prngxd0ftqg	GST	cmn8f0lv5004p1prnvfetnwpy	[{"id": "cmn8f0lr9003l1prniopow3jh", "name": "FY - 2024-25"}, {"id": "cmn8f0lrv003t1prnfj8ofdma", "name": "GST"}, {"id": "cmn8f0lv5004p1prnvfetnwpy", "name": "6-SEPTEMBER"}]	f	\N	\N	2026-03-27 04:42:35.834	2026-03-27 04:42:35.834	t
cmn8f0lvj004v1prn2kq2p8zr	7-OCTOBER	cmn8f0ld500011prngxd0ftqg	GST	cmn8f0lrv003t1prnfj8ofdma	[{"id": "cmn8f0lr9003l1prniopow3jh", "name": "FY - 2024-25"}, {"id": "cmn8f0lrv003t1prnfj8ofdma", "name": "GST"}]	f	\N	\N	2026-03-27 04:42:35.839	2026-03-27 04:42:35.839	t
cmn8f0lvr004x1prnkb0od95q	Sale Bill	cmn8f0ld500011prngxd0ftqg	GST	cmn8f0lvj004v1prn2kq2p8zr	[{"id": "cmn8f0lr9003l1prniopow3jh", "name": "FY - 2024-25"}, {"id": "cmn8f0lrv003t1prnfj8ofdma", "name": "GST"}, {"id": "cmn8f0lvj004v1prn2kq2p8zr", "name": "7-OCTOBER"}]	f	\N	\N	2026-03-27 04:42:35.847	2026-03-27 04:42:35.847	t
cmn8f0lvv004z1prnvg0owh1c	Purchase Bill	cmn8f0ld500011prngxd0ftqg	GST	cmn8f0lvj004v1prn2kq2p8zr	[{"id": "cmn8f0lr9003l1prniopow3jh", "name": "FY - 2024-25"}, {"id": "cmn8f0lrv003t1prnfj8ofdma", "name": "GST"}, {"id": "cmn8f0lvj004v1prn2kq2p8zr", "name": "7-OCTOBER"}]	f	\N	\N	2026-03-27 04:42:35.851	2026-03-27 04:42:35.851	t
cmn8f0lw000511prn4w8kycpu	8-NOVEMBER	cmn8f0ld500011prngxd0ftqg	GST	cmn8f0lrv003t1prnfj8ofdma	[{"id": "cmn8f0lr9003l1prniopow3jh", "name": "FY - 2024-25"}, {"id": "cmn8f0lrv003t1prnfj8ofdma", "name": "GST"}]	f	\N	\N	2026-03-27 04:42:35.856	2026-03-27 04:42:35.856	t
cmn8f0lw700531prnxzfnvwwm	Sale Bill	cmn8f0ld500011prngxd0ftqg	GST	cmn8f0lw000511prn4w8kycpu	[{"id": "cmn8f0lr9003l1prniopow3jh", "name": "FY - 2024-25"}, {"id": "cmn8f0lrv003t1prnfj8ofdma", "name": "GST"}, {"id": "cmn8f0lw000511prn4w8kycpu", "name": "8-NOVEMBER"}]	f	\N	\N	2026-03-27 04:42:35.863	2026-03-27 04:42:35.863	t
cmn8f0lwa00551prnx8bpj422	Purchase Bill	cmn8f0ld500011prngxd0ftqg	GST	cmn8f0lw000511prn4w8kycpu	[{"id": "cmn8f0lr9003l1prniopow3jh", "name": "FY - 2024-25"}, {"id": "cmn8f0lrv003t1prnfj8ofdma", "name": "GST"}, {"id": "cmn8f0lw000511prn4w8kycpu", "name": "8-NOVEMBER"}]	f	\N	\N	2026-03-27 04:42:35.867	2026-03-27 04:42:35.867	t
cmn8f0lwd00571prndvvh6u0g	9-DECEMBER	cmn8f0ld500011prngxd0ftqg	GST	cmn8f0lrv003t1prnfj8ofdma	[{"id": "cmn8f0lr9003l1prniopow3jh", "name": "FY - 2024-25"}, {"id": "cmn8f0lrv003t1prnfj8ofdma", "name": "GST"}]	f	\N	\N	2026-03-27 04:42:35.87	2026-03-27 04:42:35.87	t
cmn8f0lwk00591prnof0miryq	Sale Bill	cmn8f0ld500011prngxd0ftqg	GST	cmn8f0lwd00571prndvvh6u0g	[{"id": "cmn8f0lr9003l1prniopow3jh", "name": "FY - 2024-25"}, {"id": "cmn8f0lrv003t1prnfj8ofdma", "name": "GST"}, {"id": "cmn8f0lwd00571prndvvh6u0g", "name": "9-DECEMBER"}]	f	\N	\N	2026-03-27 04:42:35.876	2026-03-27 04:42:35.876	t
cmn8f0lwq005b1prn5r20yjar	Purchase Bill	cmn8f0ld500011prngxd0ftqg	GST	cmn8f0lwd00571prndvvh6u0g	[{"id": "cmn8f0lr9003l1prniopow3jh", "name": "FY - 2024-25"}, {"id": "cmn8f0lrv003t1prnfj8ofdma", "name": "GST"}, {"id": "cmn8f0lwd00571prndvvh6u0g", "name": "9-DECEMBER"}]	f	\N	\N	2026-03-27 04:42:35.882	2026-03-27 04:42:35.882	t
cmn8f0lwt005d1prn53zbupht	10-JANUARY	cmn8f0ld500011prngxd0ftqg	GST	cmn8f0lrv003t1prnfj8ofdma	[{"id": "cmn8f0lr9003l1prniopow3jh", "name": "FY - 2024-25"}, {"id": "cmn8f0lrv003t1prnfj8ofdma", "name": "GST"}]	f	\N	\N	2026-03-27 04:42:35.885	2026-03-27 04:42:35.885	t
cmn8f0lwy005f1prnhtlm5to9	Sale Bill	cmn8f0ld500011prngxd0ftqg	GST	cmn8f0lwt005d1prn53zbupht	[{"id": "cmn8f0lr9003l1prniopow3jh", "name": "FY - 2024-25"}, {"id": "cmn8f0lrv003t1prnfj8ofdma", "name": "GST"}, {"id": "cmn8f0lwt005d1prn53zbupht", "name": "10-JANUARY"}]	f	\N	\N	2026-03-27 04:42:35.89	2026-03-27 04:42:35.89	t
cmn8f0lx4005h1prn2vfytv74	Purchase Bill	cmn8f0ld500011prngxd0ftqg	GST	cmn8f0lwt005d1prn53zbupht	[{"id": "cmn8f0lr9003l1prniopow3jh", "name": "FY - 2024-25"}, {"id": "cmn8f0lrv003t1prnfj8ofdma", "name": "GST"}, {"id": "cmn8f0lwt005d1prn53zbupht", "name": "10-JANUARY"}]	f	\N	\N	2026-03-27 04:42:35.896	2026-03-27 04:42:35.896	t
cmn8f0lx7005j1prnegijypt9	11-FEBRUARY	cmn8f0ld500011prngxd0ftqg	GST	cmn8f0lrv003t1prnfj8ofdma	[{"id": "cmn8f0lr9003l1prniopow3jh", "name": "FY - 2024-25"}, {"id": "cmn8f0lrv003t1prnfj8ofdma", "name": "GST"}]	f	\N	\N	2026-03-27 04:42:35.899	2026-03-27 04:42:35.899	t
cmn8f0lxa005l1prnryj1lv1e	Sale Bill	cmn8f0ld500011prngxd0ftqg	GST	cmn8f0lx7005j1prnegijypt9	[{"id": "cmn8f0lr9003l1prniopow3jh", "name": "FY - 2024-25"}, {"id": "cmn8f0lrv003t1prnfj8ofdma", "name": "GST"}, {"id": "cmn8f0lx7005j1prnegijypt9", "name": "11-FEBRUARY"}]	f	\N	\N	2026-03-27 04:42:35.902	2026-03-27 04:42:35.902	t
cmn8f0lxd005n1prn1vuqhzf2	Purchase Bill	cmn8f0ld500011prngxd0ftqg	GST	cmn8f0lx7005j1prnegijypt9	[{"id": "cmn8f0lr9003l1prniopow3jh", "name": "FY - 2024-25"}, {"id": "cmn8f0lrv003t1prnfj8ofdma", "name": "GST"}, {"id": "cmn8f0lx7005j1prnegijypt9", "name": "11-FEBRUARY"}]	f	\N	\N	2026-03-27 04:42:35.906	2026-03-27 04:42:35.906	t
cmn8f0lxl005p1prnir8d7vwp	12-MARCH	cmn8f0ld500011prngxd0ftqg	GST	cmn8f0lrv003t1prnfj8ofdma	[{"id": "cmn8f0lr9003l1prniopow3jh", "name": "FY - 2024-25"}, {"id": "cmn8f0lrv003t1prnfj8ofdma", "name": "GST"}]	f	\N	\N	2026-03-27 04:42:35.913	2026-03-27 04:42:35.913	t
cmn8f0lxo005r1prnm6e1ugra	Sale Bill	cmn8f0ld500011prngxd0ftqg	GST	cmn8f0lxl005p1prnir8d7vwp	[{"id": "cmn8f0lr9003l1prniopow3jh", "name": "FY - 2024-25"}, {"id": "cmn8f0lrv003t1prnfj8ofdma", "name": "GST"}, {"id": "cmn8f0lxl005p1prnir8d7vwp", "name": "12-MARCH"}]	f	\N	\N	2026-03-27 04:42:35.917	2026-03-27 04:42:35.917	t
cmn8f0lxr005t1prnsvj99hzu	Purchase Bill	cmn8f0ld500011prngxd0ftqg	GST	cmn8f0lxl005p1prnir8d7vwp	[{"id": "cmn8f0lr9003l1prniopow3jh", "name": "FY - 2024-25"}, {"id": "cmn8f0lrv003t1prnfj8ofdma", "name": "GST"}, {"id": "cmn8f0lxl005p1prnir8d7vwp", "name": "12-MARCH"}]	f	\N	\N	2026-03-27 04:42:35.92	2026-03-27 04:42:35.92	t
cmn8f0lxw005v1prnt7ud6ith	TDS	cmn8f0ld500011prngxd0ftqg	TDS	cmn8f0lr9003l1prniopow3jh	[{"id": "cmn8f0lr9003l1prniopow3jh", "name": "FY - 2024-25"}]	f	\N	\N	2026-03-27 04:42:35.924	2026-03-27 04:42:35.924	t
cmn8f0ly1005x1prn1n5kl17k	Q1 - APR-JUN	cmn8f0ld500011prngxd0ftqg	TDS	cmn8f0lxw005v1prnt7ud6ith	[{"id": "cmn8f0lr9003l1prniopow3jh", "name": "FY - 2024-25"}, {"id": "cmn8f0lxw005v1prnt7ud6ith", "name": "TDS"}]	f	\N	\N	2026-03-27 04:42:35.93	2026-03-27 04:42:35.93	t
cmn8f0ly5005z1prnosqtdbst	April	cmn8f0ld500011prngxd0ftqg	TDS	cmn8f0ly1005x1prn1n5kl17k	[{"id": "cmn8f0lr9003l1prniopow3jh", "name": "FY - 2024-25"}, {"id": "cmn8f0lxw005v1prnt7ud6ith", "name": "TDS"}, {"id": "cmn8f0ly1005x1prn1n5kl17k", "name": "Q1 - APR-JUN"}]	f	\N	\N	2026-03-27 04:42:35.933	2026-03-27 04:42:35.933	t
cmn8f0ly800611prnyu19nj12	May	cmn8f0ld500011prngxd0ftqg	TDS	cmn8f0ly1005x1prn1n5kl17k	[{"id": "cmn8f0lr9003l1prniopow3jh", "name": "FY - 2024-25"}, {"id": "cmn8f0lxw005v1prnt7ud6ith", "name": "TDS"}, {"id": "cmn8f0ly1005x1prn1n5kl17k", "name": "Q1 - APR-JUN"}]	f	\N	\N	2026-03-27 04:42:35.936	2026-03-27 04:42:35.936	t
cmn8f0lyc00631prny0uhl56h	June	cmn8f0ld500011prngxd0ftqg	TDS	cmn8f0ly1005x1prn1n5kl17k	[{"id": "cmn8f0lr9003l1prniopow3jh", "name": "FY - 2024-25"}, {"id": "cmn8f0lxw005v1prnt7ud6ith", "name": "TDS"}, {"id": "cmn8f0ly1005x1prn1n5kl17k", "name": "Q1 - APR-JUN"}]	f	\N	\N	2026-03-27 04:42:35.941	2026-03-27 04:42:35.941	t
cmn8f0lyj00651prnnmlnexb9	Q2 - JUL-SEP	cmn8f0ld500011prngxd0ftqg	TDS	cmn8f0lxw005v1prnt7ud6ith	[{"id": "cmn8f0lr9003l1prniopow3jh", "name": "FY - 2024-25"}, {"id": "cmn8f0lxw005v1prnt7ud6ith", "name": "TDS"}]	f	\N	\N	2026-03-27 04:42:35.947	2026-03-27 04:42:35.947	t
cmn8f0lym00671prn6yp3u5dw	July	cmn8f0ld500011prngxd0ftqg	TDS	cmn8f0lyj00651prnnmlnexb9	[{"id": "cmn8f0lr9003l1prniopow3jh", "name": "FY - 2024-25"}, {"id": "cmn8f0lxw005v1prnt7ud6ith", "name": "TDS"}, {"id": "cmn8f0lyj00651prnnmlnexb9", "name": "Q2 - JUL-SEP"}]	f	\N	\N	2026-03-27 04:42:35.951	2026-03-27 04:42:35.951	t
cmn8f0lyq00691prnmbaehrsr	August	cmn8f0ld500011prngxd0ftqg	TDS	cmn8f0lyj00651prnnmlnexb9	[{"id": "cmn8f0lr9003l1prniopow3jh", "name": "FY - 2024-25"}, {"id": "cmn8f0lxw005v1prnt7ud6ith", "name": "TDS"}, {"id": "cmn8f0lyj00651prnnmlnexb9", "name": "Q2 - JUL-SEP"}]	f	\N	\N	2026-03-27 04:42:35.954	2026-03-27 04:42:35.954	t
cmn8f0lyv006b1prn6fotfipp	September	cmn8f0ld500011prngxd0ftqg	TDS	cmn8f0lyj00651prnnmlnexb9	[{"id": "cmn8f0lr9003l1prniopow3jh", "name": "FY - 2024-25"}, {"id": "cmn8f0lxw005v1prnt7ud6ith", "name": "TDS"}, {"id": "cmn8f0lyj00651prnnmlnexb9", "name": "Q2 - JUL-SEP"}]	f	\N	\N	2026-03-27 04:42:35.959	2026-03-27 04:42:35.959	t
cmn8f0lz0006d1prndpcz1g8s	Q3 - OCT-DEC	cmn8f0ld500011prngxd0ftqg	TDS	cmn8f0lxw005v1prnt7ud6ith	[{"id": "cmn8f0lr9003l1prniopow3jh", "name": "FY - 2024-25"}, {"id": "cmn8f0lxw005v1prnt7ud6ith", "name": "TDS"}]	f	\N	\N	2026-03-27 04:42:35.964	2026-03-27 04:42:35.964	t
cmn8f0lz3006f1prnag58brgi	October	cmn8f0ld500011prngxd0ftqg	TDS	cmn8f0lz0006d1prndpcz1g8s	[{"id": "cmn8f0lr9003l1prniopow3jh", "name": "FY - 2024-25"}, {"id": "cmn8f0lxw005v1prnt7ud6ith", "name": "TDS"}, {"id": "cmn8f0lz0006d1prndpcz1g8s", "name": "Q3 - OCT-DEC"}]	f	\N	\N	2026-03-27 04:42:35.967	2026-03-27 04:42:35.967	t
cmn8f0lz6006h1prn406lhikw	November	cmn8f0ld500011prngxd0ftqg	TDS	cmn8f0lz0006d1prndpcz1g8s	[{"id": "cmn8f0lr9003l1prniopow3jh", "name": "FY - 2024-25"}, {"id": "cmn8f0lxw005v1prnt7ud6ith", "name": "TDS"}, {"id": "cmn8f0lz0006d1prndpcz1g8s", "name": "Q3 - OCT-DEC"}]	f	\N	\N	2026-03-27 04:42:35.971	2026-03-27 04:42:35.971	t
cmn8f0lzc006j1prnk73fpmol	December	cmn8f0ld500011prngxd0ftqg	TDS	cmn8f0lz0006d1prndpcz1g8s	[{"id": "cmn8f0lr9003l1prniopow3jh", "name": "FY - 2024-25"}, {"id": "cmn8f0lxw005v1prnt7ud6ith", "name": "TDS"}, {"id": "cmn8f0lz0006d1prndpcz1g8s", "name": "Q3 - OCT-DEC"}]	f	\N	\N	2026-03-27 04:42:35.976	2026-03-27 04:42:35.976	t
cmn8f0lzi006l1prnbg75d9za	Q4 - JAN-MAR	cmn8f0ld500011prngxd0ftqg	TDS	cmn8f0lxw005v1prnt7ud6ith	[{"id": "cmn8f0lr9003l1prniopow3jh", "name": "FY - 2024-25"}, {"id": "cmn8f0lxw005v1prnt7ud6ith", "name": "TDS"}]	f	\N	\N	2026-03-27 04:42:35.983	2026-03-27 04:42:35.983	t
cmn8f0lzl006n1prntaukldzp	January	cmn8f0ld500011prngxd0ftqg	TDS	cmn8f0lzi006l1prnbg75d9za	[{"id": "cmn8f0lr9003l1prniopow3jh", "name": "FY - 2024-25"}, {"id": "cmn8f0lxw005v1prnt7ud6ith", "name": "TDS"}, {"id": "cmn8f0lzi006l1prnbg75d9za", "name": "Q4 - JAN-MAR"}]	f	\N	\N	2026-03-27 04:42:35.985	2026-03-27 04:42:35.985	t
cmn8f0lzp006p1prn1y9cc2ro	February	cmn8f0ld500011prngxd0ftqg	TDS	cmn8f0lzi006l1prnbg75d9za	[{"id": "cmn8f0lr9003l1prniopow3jh", "name": "FY - 2024-25"}, {"id": "cmn8f0lxw005v1prnt7ud6ith", "name": "TDS"}, {"id": "cmn8f0lzi006l1prnbg75d9za", "name": "Q4 - JAN-MAR"}]	f	\N	\N	2026-03-27 04:42:35.989	2026-03-27 04:42:35.989	t
cmn8f0lzv006r1prnimdyu4u6	March	cmn8f0ld500011prngxd0ftqg	TDS	cmn8f0lzi006l1prnbg75d9za	[{"id": "cmn8f0lr9003l1prniopow3jh", "name": "FY - 2024-25"}, {"id": "cmn8f0lxw005v1prnt7ud6ith", "name": "TDS"}, {"id": "cmn8f0lzi006l1prnbg75d9za", "name": "Q4 - JAN-MAR"}]	f	\N	\N	2026-03-27 04:42:35.995	2026-03-27 04:42:35.995	t
cmn8f0lzz006t1prnxttn91dd	FY - 2025-26	cmn8f0ld500011prngxd0ftqg	GENERAL	\N	[]	f	\N	\N	2026-03-27 04:42:35.999	2026-03-27 04:42:35.999	t
cmn8f0m02006v1prnsqikd7yi	ITR	cmn8f0ld500011prngxd0ftqg	ITR	cmn8f0lzz006t1prnxttn91dd	[{"id": "cmn8f0lzz006t1prnxttn91dd", "name": "FY - 2025-26"}]	f	\N	\N	2026-03-27 04:42:36.003	2026-03-27 04:42:36.003	t
cmn8f0m08006x1prnhpj6j6rt	Income Tax Return	cmn8f0ld500011prngxd0ftqg	ITR	cmn8f0m02006v1prnsqikd7yi	[{"id": "cmn8f0lzz006t1prnxttn91dd", "name": "FY - 2025-26"}, {"id": "cmn8f0m02006v1prnsqikd7yi", "name": "ITR"}]	f	\N	\N	2026-03-27 04:42:36.008	2026-03-27 04:42:36.008	t
cmn8f0m0e006z1prnsimkwx97	Bank statement	cmn8f0ld500011prngxd0ftqg	ITR	cmn8f0m02006v1prnsqikd7yi	[{"id": "cmn8f0lzz006t1prnxttn91dd", "name": "FY - 2025-26"}, {"id": "cmn8f0m02006v1prnsqikd7yi", "name": "ITR"}]	f	\N	\N	2026-03-27 04:42:36.015	2026-03-27 04:42:36.015	t
cmn8f0m0h00711prnf4qaw4rq	GST	cmn8f0ld500011prngxd0ftqg	GST	cmn8f0lzz006t1prnxttn91dd	[{"id": "cmn8f0lzz006t1prnxttn91dd", "name": "FY - 2025-26"}]	f	\N	\N	2026-03-27 04:42:36.018	2026-03-27 04:42:36.018	t
cmn8f0m0y00791prnagwzvji6	2-MAY	cmn8f0ld500011prngxd0ftqg	GST	cmn8f0m0h00711prnf4qaw4rq	[{"id": "cmn8f0lzz006t1prnxttn91dd", "name": "FY - 2025-26"}, {"id": "cmn8f0m0h00711prnf4qaw4rq", "name": "GST"}]	f	\N	\N	2026-03-27 04:42:36.034	2026-03-27 04:42:36.034	t
cmn8f0m11007b1prnfumvb6oi	Sale Bill	cmn8f0ld500011prngxd0ftqg	GST	cmn8f0m0y00791prnagwzvji6	[{"id": "cmn8f0lzz006t1prnxttn91dd", "name": "FY - 2025-26"}, {"id": "cmn8f0m0h00711prnf4qaw4rq", "name": "GST"}, {"id": "cmn8f0m0y00791prnagwzvji6", "name": "2-MAY"}]	f	\N	\N	2026-03-27 04:42:36.038	2026-03-27 04:42:36.038	t
cmn8f0m16007d1prn4lkw0sgc	Purchase Bill	cmn8f0ld500011prngxd0ftqg	GST	cmn8f0m0y00791prnagwzvji6	[{"id": "cmn8f0lzz006t1prnxttn91dd", "name": "FY - 2025-26"}, {"id": "cmn8f0m0h00711prnf4qaw4rq", "name": "GST"}, {"id": "cmn8f0m0y00791prnagwzvji6", "name": "2-MAY"}]	f	\N	\N	2026-03-27 04:42:36.043	2026-03-27 04:42:36.043	t
cmn8f0m1c007f1prn7sr46o8b	3-JUNE	cmn8f0ld500011prngxd0ftqg	GST	cmn8f0m0h00711prnf4qaw4rq	[{"id": "cmn8f0lzz006t1prnxttn91dd", "name": "FY - 2025-26"}, {"id": "cmn8f0m0h00711prnf4qaw4rq", "name": "GST"}]	f	\N	\N	2026-03-27 04:42:36.048	2026-03-27 04:42:36.048	t
cmn8f0m1f007h1prn8rcvkzyt	Sale Bill	cmn8f0ld500011prngxd0ftqg	GST	cmn8f0m1c007f1prn7sr46o8b	[{"id": "cmn8f0lzz006t1prnxttn91dd", "name": "FY - 2025-26"}, {"id": "cmn8f0m0h00711prnf4qaw4rq", "name": "GST"}, {"id": "cmn8f0m1c007f1prn7sr46o8b", "name": "3-JUNE"}]	f	\N	\N	2026-03-27 04:42:36.052	2026-03-27 04:42:36.052	t
cmn8f0m1j007j1prnhzu9zdtd	Purchase Bill	cmn8f0ld500011prngxd0ftqg	GST	cmn8f0m1c007f1prn7sr46o8b	[{"id": "cmn8f0lzz006t1prnxttn91dd", "name": "FY - 2025-26"}, {"id": "cmn8f0m0h00711prnf4qaw4rq", "name": "GST"}, {"id": "cmn8f0m1c007f1prn7sr46o8b", "name": "3-JUNE"}]	f	\N	\N	2026-03-27 04:42:36.056	2026-03-27 04:42:36.056	t
cmn8f0m1p007l1prnfbq1r8on	4-JULY	cmn8f0ld500011prngxd0ftqg	GST	cmn8f0m0h00711prnf4qaw4rq	[{"id": "cmn8f0lzz006t1prnxttn91dd", "name": "FY - 2025-26"}, {"id": "cmn8f0m0h00711prnf4qaw4rq", "name": "GST"}]	f	\N	\N	2026-03-27 04:42:36.061	2026-03-27 04:42:36.061	t
cmn8f0m0v00771prnbmc71202	Purchase Bill	cmn8f0ld500011prngxd0ftqg	GST	cmn8f0m0l00731prnw33nrcwv	[{"id": "cmn8f0lzz006t1prnxttn91dd", "name": "FY - 2025-26"}, {"id": "cmn8f0m0h00711prnf4qaw4rq", "name": "GST"}, {"id": "cmn8f0m0l00731prnw33nrcwv", "name": "1-APRIL"}]	f	\N	\N	2026-03-27 04:42:36.031	2026-03-27 07:18:23.323	t
cmn8f0m0q00751prngj7dnx8v	Sale Bill	cmn8f0ld500011prngxd0ftqg	GST	cmn8f0m0l00731prnw33nrcwv	[{"id": "cmn8f0lzz006t1prnxttn91dd", "name": "FY - 2025-26"}, {"id": "cmn8f0m0h00711prnf4qaw4rq", "name": "GST"}, {"id": "cmn8f0m0l00731prnw33nrcwv", "name": "1-APRIL"}]	f	\N	\N	2026-03-27 04:42:36.026	2026-03-27 05:01:35.1	t
cmn8f0m1u007n1prnzkpfsx0y	Sale Bill	cmn8f0ld500011prngxd0ftqg	GST	cmn8f0m1p007l1prnfbq1r8on	[{"id": "cmn8f0lzz006t1prnxttn91dd", "name": "FY - 2025-26"}, {"id": "cmn8f0m0h00711prnf4qaw4rq", "name": "GST"}, {"id": "cmn8f0m1p007l1prnfbq1r8on", "name": "4-JULY"}]	f	\N	\N	2026-03-27 04:42:36.066	2026-03-27 04:42:36.066	t
cmn8f0m1y007p1prn5qxfw1ya	Purchase Bill	cmn8f0ld500011prngxd0ftqg	GST	cmn8f0m1p007l1prnfbq1r8on	[{"id": "cmn8f0lzz006t1prnxttn91dd", "name": "FY - 2025-26"}, {"id": "cmn8f0m0h00711prnf4qaw4rq", "name": "GST"}, {"id": "cmn8f0m1p007l1prnfbq1r8on", "name": "4-JULY"}]	f	\N	\N	2026-03-27 04:42:36.07	2026-03-27 04:42:36.07	t
cmn8f0m21007r1prnstrn29y1	5-AUGUST	cmn8f0ld500011prngxd0ftqg	GST	cmn8f0m0h00711prnf4qaw4rq	[{"id": "cmn8f0lzz006t1prnxttn91dd", "name": "FY - 2025-26"}, {"id": "cmn8f0m0h00711prnf4qaw4rq", "name": "GST"}]	f	\N	\N	2026-03-27 04:42:36.074	2026-03-27 04:42:36.074	t
cmn8f0m27007t1prn1wng2pot	Sale Bill	cmn8f0ld500011prngxd0ftqg	GST	cmn8f0m21007r1prnstrn29y1	[{"id": "cmn8f0lzz006t1prnxttn91dd", "name": "FY - 2025-26"}, {"id": "cmn8f0m0h00711prnf4qaw4rq", "name": "GST"}, {"id": "cmn8f0m21007r1prnstrn29y1", "name": "5-AUGUST"}]	f	\N	\N	2026-03-27 04:42:36.079	2026-03-27 04:42:36.079	t
cmn8f0m2b007v1prnmcz9wczv	Purchase Bill	cmn8f0ld500011prngxd0ftqg	GST	cmn8f0m21007r1prnstrn29y1	[{"id": "cmn8f0lzz006t1prnxttn91dd", "name": "FY - 2025-26"}, {"id": "cmn8f0m0h00711prnf4qaw4rq", "name": "GST"}, {"id": "cmn8f0m21007r1prnstrn29y1", "name": "5-AUGUST"}]	f	\N	\N	2026-03-27 04:42:36.083	2026-03-27 04:42:36.083	t
cmn8f0m2e007x1prnjh41acy2	6-SEPTEMBER	cmn8f0ld500011prngxd0ftqg	GST	cmn8f0m0h00711prnf4qaw4rq	[{"id": "cmn8f0lzz006t1prnxttn91dd", "name": "FY - 2025-26"}, {"id": "cmn8f0m0h00711prnf4qaw4rq", "name": "GST"}]	f	\N	\N	2026-03-27 04:42:36.086	2026-03-27 04:42:36.086	t
cmn8f0m2j007z1prnzyj3z73a	Sale Bill	cmn8f0ld500011prngxd0ftqg	GST	cmn8f0m2e007x1prnjh41acy2	[{"id": "cmn8f0lzz006t1prnxttn91dd", "name": "FY - 2025-26"}, {"id": "cmn8f0m0h00711prnf4qaw4rq", "name": "GST"}, {"id": "cmn8f0m2e007x1prnjh41acy2", "name": "6-SEPTEMBER"}]	f	\N	\N	2026-03-27 04:42:36.091	2026-03-27 04:42:36.091	t
cmn8f0m2p00811prnobkak8jo	Purchase Bill	cmn8f0ld500011prngxd0ftqg	GST	cmn8f0m2e007x1prnjh41acy2	[{"id": "cmn8f0lzz006t1prnxttn91dd", "name": "FY - 2025-26"}, {"id": "cmn8f0m0h00711prnf4qaw4rq", "name": "GST"}, {"id": "cmn8f0m2e007x1prnjh41acy2", "name": "6-SEPTEMBER"}]	f	\N	\N	2026-03-27 04:42:36.097	2026-03-27 04:42:36.097	t
cmn8f0m2s00831prnq0k8p01y	7-OCTOBER	cmn8f0ld500011prngxd0ftqg	GST	cmn8f0m0h00711prnf4qaw4rq	[{"id": "cmn8f0lzz006t1prnxttn91dd", "name": "FY - 2025-26"}, {"id": "cmn8f0m0h00711prnf4qaw4rq", "name": "GST"}]	f	\N	\N	2026-03-27 04:42:36.1	2026-03-27 04:42:36.1	t
cmn8f0m2v00851prn8if1vu48	Sale Bill	cmn8f0ld500011prngxd0ftqg	GST	cmn8f0m2s00831prnq0k8p01y	[{"id": "cmn8f0lzz006t1prnxttn91dd", "name": "FY - 2025-26"}, {"id": "cmn8f0m0h00711prnf4qaw4rq", "name": "GST"}, {"id": "cmn8f0m2s00831prnq0k8p01y", "name": "7-OCTOBER"}]	f	\N	\N	2026-03-27 04:42:36.103	2026-03-27 04:42:36.103	t
cmn8f0m3000871prntzst0ygp	Purchase Bill	cmn8f0ld500011prngxd0ftqg	GST	cmn8f0m2s00831prnq0k8p01y	[{"id": "cmn8f0lzz006t1prnxttn91dd", "name": "FY - 2025-26"}, {"id": "cmn8f0m0h00711prnf4qaw4rq", "name": "GST"}, {"id": "cmn8f0m2s00831prnq0k8p01y", "name": "7-OCTOBER"}]	f	\N	\N	2026-03-27 04:42:36.108	2026-03-27 04:42:36.108	t
cmn8f0m3500891prnn3q7pud6	8-NOVEMBER	cmn8f0ld500011prngxd0ftqg	GST	cmn8f0m0h00711prnf4qaw4rq	[{"id": "cmn8f0lzz006t1prnxttn91dd", "name": "FY - 2025-26"}, {"id": "cmn8f0m0h00711prnf4qaw4rq", "name": "GST"}]	f	\N	\N	2026-03-27 04:42:36.113	2026-03-27 04:42:36.113	t
cmn8f0m38008b1prnkqoneram	Sale Bill	cmn8f0ld500011prngxd0ftqg	GST	cmn8f0m3500891prnn3q7pud6	[{"id": "cmn8f0lzz006t1prnxttn91dd", "name": "FY - 2025-26"}, {"id": "cmn8f0m0h00711prnf4qaw4rq", "name": "GST"}, {"id": "cmn8f0m3500891prnn3q7pud6", "name": "8-NOVEMBER"}]	f	\N	\N	2026-03-27 04:42:36.117	2026-03-27 04:42:36.117	t
cmn8f0m3b008d1prn1i1eq7to	Purchase Bill	cmn8f0ld500011prngxd0ftqg	GST	cmn8f0m3500891prnn3q7pud6	[{"id": "cmn8f0lzz006t1prnxttn91dd", "name": "FY - 2025-26"}, {"id": "cmn8f0m0h00711prnf4qaw4rq", "name": "GST"}, {"id": "cmn8f0m3500891prnn3q7pud6", "name": "8-NOVEMBER"}]	f	\N	\N	2026-03-27 04:42:36.12	2026-03-27 04:42:36.12	t
cmn8f0m3f008f1prnk5wchkee	9-DECEMBER	cmn8f0ld500011prngxd0ftqg	GST	cmn8f0m0h00711prnf4qaw4rq	[{"id": "cmn8f0lzz006t1prnxttn91dd", "name": "FY - 2025-26"}, {"id": "cmn8f0m0h00711prnf4qaw4rq", "name": "GST"}]	f	\N	\N	2026-03-27 04:42:36.123	2026-03-27 04:42:36.123	t
cmn8f0m3l008h1prnfyza0399	Sale Bill	cmn8f0ld500011prngxd0ftqg	GST	cmn8f0m3f008f1prnk5wchkee	[{"id": "cmn8f0lzz006t1prnxttn91dd", "name": "FY - 2025-26"}, {"id": "cmn8f0m0h00711prnf4qaw4rq", "name": "GST"}, {"id": "cmn8f0m3f008f1prnk5wchkee", "name": "9-DECEMBER"}]	f	\N	\N	2026-03-27 04:42:36.129	2026-03-27 04:42:36.129	t
cmn8f0m3p008j1prnw8yh3qoh	Purchase Bill	cmn8f0ld500011prngxd0ftqg	GST	cmn8f0m3f008f1prnk5wchkee	[{"id": "cmn8f0lzz006t1prnxttn91dd", "name": "FY - 2025-26"}, {"id": "cmn8f0m0h00711prnf4qaw4rq", "name": "GST"}, {"id": "cmn8f0m3f008f1prnk5wchkee", "name": "9-DECEMBER"}]	f	\N	\N	2026-03-27 04:42:36.134	2026-03-27 04:42:36.134	t
cmn8f0m3s008l1prny71886rj	10-JANUARY	cmn8f0ld500011prngxd0ftqg	GST	cmn8f0m0h00711prnf4qaw4rq	[{"id": "cmn8f0lzz006t1prnxttn91dd", "name": "FY - 2025-26"}, {"id": "cmn8f0m0h00711prnf4qaw4rq", "name": "GST"}]	f	\N	\N	2026-03-27 04:42:36.137	2026-03-27 04:42:36.137	t
cmn8f0m3w008n1prn4hoz8j11	Sale Bill	cmn8f0ld500011prngxd0ftqg	GST	cmn8f0m3s008l1prny71886rj	[{"id": "cmn8f0lzz006t1prnxttn91dd", "name": "FY - 2025-26"}, {"id": "cmn8f0m0h00711prnf4qaw4rq", "name": "GST"}, {"id": "cmn8f0m3s008l1prny71886rj", "name": "10-JANUARY"}]	f	\N	\N	2026-03-27 04:42:36.14	2026-03-27 04:42:36.14	t
cmn8f0m40008p1prn2yfm5es0	Purchase Bill	cmn8f0ld500011prngxd0ftqg	GST	cmn8f0m3s008l1prny71886rj	[{"id": "cmn8f0lzz006t1prnxttn91dd", "name": "FY - 2025-26"}, {"id": "cmn8f0m0h00711prnf4qaw4rq", "name": "GST"}, {"id": "cmn8f0m3s008l1prny71886rj", "name": "10-JANUARY"}]	f	\N	\N	2026-03-27 04:42:36.145	2026-03-27 04:42:36.145	t
cmn8f0m46008r1prn3ibhn6ap	11-FEBRUARY	cmn8f0ld500011prngxd0ftqg	GST	cmn8f0m0h00711prnf4qaw4rq	[{"id": "cmn8f0lzz006t1prnxttn91dd", "name": "FY - 2025-26"}, {"id": "cmn8f0m0h00711prnf4qaw4rq", "name": "GST"}]	f	\N	\N	2026-03-27 04:42:36.15	2026-03-27 04:42:36.15	t
cmn8f0m48008t1prnemjjhw0k	Sale Bill	cmn8f0ld500011prngxd0ftqg	GST	cmn8f0m46008r1prn3ibhn6ap	[{"id": "cmn8f0lzz006t1prnxttn91dd", "name": "FY - 2025-26"}, {"id": "cmn8f0m0h00711prnf4qaw4rq", "name": "GST"}, {"id": "cmn8f0m46008r1prn3ibhn6ap", "name": "11-FEBRUARY"}]	f	\N	\N	2026-03-27 04:42:36.153	2026-03-27 04:42:36.153	t
cmn8f0m4c008v1prnuhfxfetb	Purchase Bill	cmn8f0ld500011prngxd0ftqg	GST	cmn8f0m46008r1prn3ibhn6ap	[{"id": "cmn8f0lzz006t1prnxttn91dd", "name": "FY - 2025-26"}, {"id": "cmn8f0m0h00711prnf4qaw4rq", "name": "GST"}, {"id": "cmn8f0m46008r1prn3ibhn6ap", "name": "11-FEBRUARY"}]	f	\N	\N	2026-03-27 04:42:36.156	2026-03-27 04:42:36.156	t
cmn8f0m4i008x1prnxioz4ntn	12-MARCH	cmn8f0ld500011prngxd0ftqg	GST	cmn8f0m0h00711prnf4qaw4rq	[{"id": "cmn8f0lzz006t1prnxttn91dd", "name": "FY - 2025-26"}, {"id": "cmn8f0m0h00711prnf4qaw4rq", "name": "GST"}]	f	\N	\N	2026-03-27 04:42:36.162	2026-03-27 04:42:36.162	t
cmn8f0m4l008z1prn8kd07h2b	Sale Bill	cmn8f0ld500011prngxd0ftqg	GST	cmn8f0m4i008x1prnxioz4ntn	[{"id": "cmn8f0lzz006t1prnxttn91dd", "name": "FY - 2025-26"}, {"id": "cmn8f0m0h00711prnf4qaw4rq", "name": "GST"}, {"id": "cmn8f0m4i008x1prnxioz4ntn", "name": "12-MARCH"}]	f	\N	\N	2026-03-27 04:42:36.165	2026-03-27 04:42:36.165	t
cmn8f0m4o00911prnctfkqgom	Purchase Bill	cmn8f0ld500011prngxd0ftqg	GST	cmn8f0m4i008x1prnxioz4ntn	[{"id": "cmn8f0lzz006t1prnxttn91dd", "name": "FY - 2025-26"}, {"id": "cmn8f0m0h00711prnf4qaw4rq", "name": "GST"}, {"id": "cmn8f0m4i008x1prnxioz4ntn", "name": "12-MARCH"}]	f	\N	\N	2026-03-27 04:42:36.169	2026-03-27 04:42:36.169	t
cmn8f0m4s00931prnnm724avz	TDS	cmn8f0ld500011prngxd0ftqg	TDS	cmn8f0lzz006t1prnxttn91dd	[{"id": "cmn8f0lzz006t1prnxttn91dd", "name": "FY - 2025-26"}]	f	\N	\N	2026-03-27 04:42:36.172	2026-03-27 04:42:36.172	t
cmn8f0m4w00951prn9w2xhuko	Q1 - APR-JUN	cmn8f0ld500011prngxd0ftqg	TDS	cmn8f0m4s00931prnnm724avz	[{"id": "cmn8f0lzz006t1prnxttn91dd", "name": "FY - 2025-26"}, {"id": "cmn8f0m4s00931prnnm724avz", "name": "TDS"}]	f	\N	\N	2026-03-27 04:42:36.176	2026-03-27 04:42:36.176	t
cmn8f0m5200971prnwpksaszg	April	cmn8f0ld500011prngxd0ftqg	TDS	cmn8f0m4w00951prn9w2xhuko	[{"id": "cmn8f0lzz006t1prnxttn91dd", "name": "FY - 2025-26"}, {"id": "cmn8f0m4s00931prnnm724avz", "name": "TDS"}, {"id": "cmn8f0m4w00951prn9w2xhuko", "name": "Q1 - APR-JUN"}]	f	\N	\N	2026-03-27 04:42:36.182	2026-03-27 04:42:36.182	t
cmn8f0m5500991prniu8tyjvp	May	cmn8f0ld500011prngxd0ftqg	TDS	cmn8f0m4w00951prn9w2xhuko	[{"id": "cmn8f0lzz006t1prnxttn91dd", "name": "FY - 2025-26"}, {"id": "cmn8f0m4s00931prnnm724avz", "name": "TDS"}, {"id": "cmn8f0m4w00951prn9w2xhuko", "name": "Q1 - APR-JUN"}]	f	\N	\N	2026-03-27 04:42:36.185	2026-03-27 04:42:36.185	t
cmn8f0m59009b1prnurydiyqq	June	cmn8f0ld500011prngxd0ftqg	TDS	cmn8f0m4w00951prn9w2xhuko	[{"id": "cmn8f0lzz006t1prnxttn91dd", "name": "FY - 2025-26"}, {"id": "cmn8f0m4s00931prnnm724avz", "name": "TDS"}, {"id": "cmn8f0m4w00951prn9w2xhuko", "name": "Q1 - APR-JUN"}]	f	\N	\N	2026-03-27 04:42:36.189	2026-03-27 04:42:36.189	t
cmn8f0m5f009d1prnvrpjp4dp	Q2 - JUL-SEP	cmn8f0ld500011prngxd0ftqg	TDS	cmn8f0m4s00931prnnm724avz	[{"id": "cmn8f0lzz006t1prnxttn91dd", "name": "FY - 2025-26"}, {"id": "cmn8f0m4s00931prnnm724avz", "name": "TDS"}]	f	\N	\N	2026-03-27 04:42:36.195	2026-03-27 04:42:36.195	t
cmn8f0m5j009f1prn7acotz6i	July	cmn8f0ld500011prngxd0ftqg	TDS	cmn8f0m5f009d1prnvrpjp4dp	[{"id": "cmn8f0lzz006t1prnxttn91dd", "name": "FY - 2025-26"}, {"id": "cmn8f0m4s00931prnnm724avz", "name": "TDS"}, {"id": "cmn8f0m5f009d1prnvrpjp4dp", "name": "Q2 - JUL-SEP"}]	f	\N	\N	2026-03-27 04:42:36.199	2026-03-27 04:42:36.199	t
cmn8f0m5l009h1prnpoeoe2vy	August	cmn8f0ld500011prngxd0ftqg	TDS	cmn8f0m5f009d1prnvrpjp4dp	[{"id": "cmn8f0lzz006t1prnxttn91dd", "name": "FY - 2025-26"}, {"id": "cmn8f0m4s00931prnnm724avz", "name": "TDS"}, {"id": "cmn8f0m5f009d1prnvrpjp4dp", "name": "Q2 - JUL-SEP"}]	f	\N	\N	2026-03-27 04:42:36.202	2026-03-27 04:42:36.202	t
cmn8f0m5p009j1prngu7s726a	September	cmn8f0ld500011prngxd0ftqg	TDS	cmn8f0m5f009d1prnvrpjp4dp	[{"id": "cmn8f0lzz006t1prnxttn91dd", "name": "FY - 2025-26"}, {"id": "cmn8f0m4s00931prnnm724avz", "name": "TDS"}, {"id": "cmn8f0m5f009d1prnvrpjp4dp", "name": "Q2 - JUL-SEP"}]	f	\N	\N	2026-03-27 04:42:36.205	2026-03-27 04:42:36.205	t
cmn8f0m5t009l1prnrg78qunw	Q3 - OCT-DEC	cmn8f0ld500011prngxd0ftqg	TDS	cmn8f0m4s00931prnnm724avz	[{"id": "cmn8f0lzz006t1prnxttn91dd", "name": "FY - 2025-26"}, {"id": "cmn8f0m4s00931prnnm724avz", "name": "TDS"}]	f	\N	\N	2026-03-27 04:42:36.209	2026-03-27 04:42:36.209	t
cmn8f0m5z009n1prn8or30thi	October	cmn8f0ld500011prngxd0ftqg	TDS	cmn8f0m5t009l1prnrg78qunw	[{"id": "cmn8f0lzz006t1prnxttn91dd", "name": "FY - 2025-26"}, {"id": "cmn8f0m4s00931prnnm724avz", "name": "TDS"}, {"id": "cmn8f0m5t009l1prnrg78qunw", "name": "Q3 - OCT-DEC"}]	f	\N	\N	2026-03-27 04:42:36.215	2026-03-27 04:42:36.215	t
cmn8f0m62009p1prnk1rputo0	November	cmn8f0ld500011prngxd0ftqg	TDS	cmn8f0m5t009l1prnrg78qunw	[{"id": "cmn8f0lzz006t1prnxttn91dd", "name": "FY - 2025-26"}, {"id": "cmn8f0m4s00931prnnm724avz", "name": "TDS"}, {"id": "cmn8f0m5t009l1prnrg78qunw", "name": "Q3 - OCT-DEC"}]	f	\N	\N	2026-03-27 04:42:36.218	2026-03-27 04:42:36.218	t
cmn8f0m64009r1prn5jr9y035	December	cmn8f0ld500011prngxd0ftqg	TDS	cmn8f0m5t009l1prnrg78qunw	[{"id": "cmn8f0lzz006t1prnxttn91dd", "name": "FY - 2025-26"}, {"id": "cmn8f0m4s00931prnnm724avz", "name": "TDS"}, {"id": "cmn8f0m5t009l1prnrg78qunw", "name": "Q3 - OCT-DEC"}]	f	\N	\N	2026-03-27 04:42:36.221	2026-03-27 04:42:36.221	t
cmn8f0m6a009v1prn0zvn9kmv	January	cmn8f0ld500011prngxd0ftqg	TDS	cmn8f0m67009t1prngxkl1v2o	[{"id": "cmn8f0lzz006t1prnxttn91dd", "name": "FY - 2025-26"}, {"id": "cmn8f0m4s00931prnnm724avz", "name": "TDS"}, {"id": "cmn8f0m67009t1prngxkl1v2o", "name": "Q4 - JAN-MAR"}]	f	\N	\N	2026-03-27 04:42:36.226	2026-03-27 04:42:36.226	t
cmn8f0m6c009x1prn3rmwnrtd	February	cmn8f0ld500011prngxd0ftqg	TDS	cmn8f0m67009t1prngxkl1v2o	[{"id": "cmn8f0lzz006t1prnxttn91dd", "name": "FY - 2025-26"}, {"id": "cmn8f0m4s00931prnnm724avz", "name": "TDS"}, {"id": "cmn8f0m67009t1prngxkl1v2o", "name": "Q4 - JAN-MAR"}]	f	\N	\N	2026-03-27 04:42:36.228	2026-03-27 04:42:36.228	t
cmn8f0m6f009z1prn8qwjm8j1	March	cmn8f0ld500011prngxd0ftqg	TDS	cmn8f0m67009t1prngxkl1v2o	[{"id": "cmn8f0lzz006t1prnxttn91dd", "name": "FY - 2025-26"}, {"id": "cmn8f0m4s00931prnnm724avz", "name": "TDS"}, {"id": "cmn8f0m67009t1prngxkl1v2o", "name": "Q4 - JAN-MAR"}]	f	\N	\N	2026-03-27 04:42:36.231	2026-03-27 04:42:36.231	t
cmn8ermxg001ng0tvbunm95i2	Q1 - APR-JUN	cmn8ermhw0001g0tv2tsvykws	TDS	cmn8ermx8001lg0tvhpt9kcgh	[{"id": "cmn8ermw5001dg0tv9nggxgyw", "name": "FY - 2025-26"}, {"id": "cmn8ermx8001lg0tvhpt9kcgh", "name": "TDS"}]	f	\N	\N	2026-03-27 04:35:37.3	2026-03-27 04:56:57.268	t
cmn8f0m67009t1prngxkl1v2o	Q4 - JAN-MAR	cmn8f0ld500011prngxd0ftqg	TDS	cmn8f0m4s00931prnnm724avz	[{"id": "cmn8f0lzz006t1prnxttn91dd", "name": "FY - 2025-26"}, {"id": "cmn8f0m4s00931prnnm724avz", "name": "TDS"}]	f	\N	\N	2026-03-27 04:42:36.223	2026-03-27 06:10:44.278	t
cmn8f0m0l00731prnw33nrcwv	1-APRIL	cmn8f0ld500011prngxd0ftqg	GST	cmn8f0m0h00711prnf4qaw4rq	[{"id": "cmn8f0lzz006t1prnxttn91dd", "name": "FY - 2025-26"}, {"id": "cmn8f0m0h00711prnf4qaw4rq", "name": "GST"}]	f	\N	\N	2026-03-27 04:42:36.021	2026-03-27 07:18:22.723	t
\.


--
-- Data for Name: HelpArticle; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."HelpArticle" (id, title, content, category, audience, "createdAt", "updatedAt") FROM stdin;
cmn81k4nw0000eyq3ko1585dr	GST Filing Guide	<h2>GST Filing Process</h2><p>Step-by-step guide to filing GSTR-1 and GSTR-3B for your clients directly from MyCAFiles. Ensure all invoices are uploaded before the 10th of the month.</p>	GST & Returns	ca	2026-03-26 22:25:52.029	2026-03-26 22:25:52.029
cmn81k4nx0001eyq3323bwbk8	Income Tax E-Filing	<h2>ITR E-Filing</h2><p>Our integrated portal allows you to upload XMLs directly to the IT portal. Track the status of every filing in real-time from your dashboard.</p>	ITR Filing Help	ca	2026-03-26 22:25:52.029	2026-03-26 22:25:52.029
cmn81k4nx0002eyq3l9ah5qqh	Bulk Onboarding	<h2>Import Clients in Bulk</h2><p>Save time by importing all your clients using our CSV template. Map your existing database fields to our portal effortlessly.</p>	Client Management	ca	2026-03-26 22:25:52.029	2026-03-26 22:25:52.029
cmn81k4o40003eyq35hjk2rpf	Understanding your GST Summary	<h2>Your Monthly Summary</h2><p>How to read the monthly GST summary provided by your CA. Understand your input tax credit and tax payable at a glance.</p>	GST & Returns	client	2026-03-26 22:25:52.037	2026-03-26 22:25:52.037
cmn81k4o40004eyq31kjxt22b	Uploading Docs for ITR	<h2>Preparing for Tax Season</h2><p>Upload your Form 16, bank statements, and investment proofs into the ITR folder. Your CA will be notified instantly.</p>	ITR Filing Help	client	2026-03-26 22:25:52.037	2026-03-26 22:25:52.037
cmn8ht8su00004hxju4hpr04u	GST Filing Guide	<h2>GST Filing Process</h2><p>Step-by-step guide to filing GSTR-1 and GSTR-3B for your clients directly from MyCAFiles. Ensure all invoices are uploaded before the 10th of the month.</p>	GST & Returns	ca	2026-03-27 06:00:51.15	2026-03-27 06:00:51.15
cmn8ht8sv00014hxj3a79dc42	Income Tax E-Filing	<h2>ITR E-Filing</h2><p>Our integrated portal allows you to upload XMLs directly to the IT portal. Track the status of every filing in real-time from your dashboard.</p>	ITR Filing Help	ca	2026-03-27 06:00:51.15	2026-03-27 06:00:51.15
cmn8ht8sv00024hxjyxkkx6yd	Bulk Onboarding	<h2>Import Clients in Bulk</h2><p>Save time by importing all your clients using our CSV template. Map your existing database fields to our portal effortlessly.</p>	Client Management	ca	2026-03-27 06:00:51.15	2026-03-27 06:00:51.15
cmn8ht8th00034hxj8uhxmqjl	Understanding your GST Summary	<h2>Your Monthly Summary</h2><p>How to read the monthly GST summary provided by your CA. Understand your input tax credit and tax payable at a glance.</p>	GST & Returns	client	2026-03-27 06:00:51.173	2026-03-27 06:00:51.173
cmn8ht8th00044hxj0b1qr2zi	Uploading Docs for ITR	<h2>Preparing for Tax Season</h2><p>Upload your Form 16, bank statements, and investment proofs into the ITR folder. Your CA will be notified instantly.</p>	ITR Filing Help	client	2026-03-27 06:00:51.173	2026-03-27 06:00:51.173
\.


--
-- Data for Name: LoginRequest; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."LoginRequest" (id, "clientId", "deviceId", "deviceName", status, "requestDate") FROM stdin;
\.


--
-- Data for Name: Notification; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Notification" (id, "recipientId", "senderId", title, message, type, "isRead", "docId", "clientId", "folderId", "createdAt", "updatedAt", "senderUserId") FROM stdin;
cmn5r12080001evz6j2a25bhv	cmn2ol0ae0000d8dbu2s1mv6u	\N	Test Notification 🔔	This is a test notification from your CA Admin panel. If you see this, notifications are working correctly!	GENERAL	f	\N	\N	\N	2026-03-25 07:55:33.604	2026-03-25 07:55:33.604	\N
cmn5rhx3y0001ef9h83mbrrw5	cmn2ol0ae0000d8dbu2s1mv6u	\N	Test Notification 🔔	This is a test notification from your CA Admin panel. If you see this, notifications are working correctly!	GENERAL	f	\N	\N	\N	2026-03-25 08:08:40.413	2026-03-25 08:08:40.413	\N
cmn5rlgfd0001kb0jbl1rwtg8	cmn2ol0ae0000d8dbu2s1mv6u	\N	Test Notification 🔔	This is a test notification from your CA Admin panel. If you see this, notifications are working correctly!	GENERAL	f	\N	\N	\N	2026-03-25 08:11:25.418	2026-03-25 08:11:25.418	\N
cmn6x8hle0003ff9kht1tbcng	cmn2ol0ae0000d8dbu2s1mv6u	\N	New Document Received	John Doe has uploaded a new document: 259099746356_1774441184490.pdf	FILE_UPLOAD	f	\N	\N	\N	2026-03-26 03:37:04.273	2026-03-26 03:37:04.273	\N
cmn78b3tm0003x6lr2t6b5u2l	cmn2ol0ae0000d8dbu2s1mv6u	\N	New Document Received	John Doe has uploaded a new document: MetaAdWorks Leads - current clients.pdf	FILE_UPLOAD	f	\N	\N	\N	2026-03-26 08:47:02.17	2026-03-26 08:47:02.17	\N
cmn6z8ye20003hdbtdrsuhnxj	cmn2ol0ae0000d8dbu2s1mv6u	\N	New Document Received	John Doe has uploaded a new document: MetaAdWorks Leads - total clients.pdf	FILE_UPLOAD	f	\N	\N	\N	2026-03-26 04:33:25.274	2026-03-26 04:33:25.274	\N
cmn8kggx90004826p2gskab0g	\N	\N	New Document Received	Your CA has uploaded a new document: error_report.xlsx	FILE_UPLOAD	f	cmn8kggum0000826pho0kn0n0	cmn8f0ld500011prngxd0ftqg	\N	2026-03-27 07:14:53.996	2026-03-27 07:14:53.996	cmn2ol0ae0000d8dbu2s1mv6u
\.


--
-- Data for Name: User; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."User" (id, name, email, password, role, status, phone, "FRNno", "resetPasswordToken", "resetPasswordExpire", "createdAt", "updatedAt") FROM stdin;
cmn2nz7ah0000s3m3pks59493	Updated Admin Name	test@admin.com	$2b$10$C5SSNv2nJlrPD/dkWCgYyeMaD49g8RwxH9NGtah94FwgtrdgVtS0e	SUPERADMIN	active	9876543210	\N	\N	\N	2026-03-23 04:06:49.769	2026-03-23 04:09:02.809
cmn2ol0ae0000d8dbu2s1mv6u	John Doe	ca@gmail.com	$2b$10$cYFjbOxu5uVZYjnSsLcRFeSk0W7PwTXToyLBf8PhHlaCYN6f8BwIa	CAADMIN	active	\N	\N	\N	\N	2026-03-23 04:23:47.125	2026-03-23 04:23:47.125
\.


--
-- Data for Name: _prisma_migrations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) FROM stdin;
a0c4bb2b-e816-4656-8882-2daade56f89a	035eafdd8d9ff48da5f9aa1670c5111bf3ebc5a92109ce4fab0e63a6e58fcd75	2026-03-23 01:22:52.97344+05:30	20260322195252_init_postgres	\N	\N	2026-03-23 01:22:52.828189+05:30	1
\.


--
-- Name: ActivityLog ActivityLog_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ActivityLog"
    ADD CONSTRAINT "ActivityLog_pkey" PRIMARY KEY (id);


--
-- Name: Banner Banner_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Banner"
    ADD CONSTRAINT "Banner_pkey" PRIMARY KEY (id);


--
-- Name: Client Client_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Client"
    ADD CONSTRAINT "Client_pkey" PRIMARY KEY (id);


--
-- Name: Document Document_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Document"
    ADD CONSTRAINT "Document_pkey" PRIMARY KEY (id);


--
-- Name: FAQ FAQ_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."FAQ"
    ADD CONSTRAINT "FAQ_pkey" PRIMARY KEY (id);


--
-- Name: Folder Folder_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Folder"
    ADD CONSTRAINT "Folder_pkey" PRIMARY KEY (id);


--
-- Name: HelpArticle HelpArticle_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."HelpArticle"
    ADD CONSTRAINT "HelpArticle_pkey" PRIMARY KEY (id);


--
-- Name: LoginRequest LoginRequest_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."LoginRequest"
    ADD CONSTRAINT "LoginRequest_pkey" PRIMARY KEY (id);


--
-- Name: Notification Notification_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Notification"
    ADD CONSTRAINT "Notification_pkey" PRIMARY KEY (id);


--
-- Name: User User_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_pkey" PRIMARY KEY (id);


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: ActivityLog_caId_timestamp_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ActivityLog_caId_timestamp_idx" ON public."ActivityLog" USING btree ("caId", "timestamp" DESC);


--
-- Name: Client_caId_fileNumber_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "Client_caId_fileNumber_key" ON public."Client" USING btree ("caId", "fileNumber");


--
-- Name: Client_gstNumber_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "Client_gstNumber_key" ON public."Client" USING btree ("gstNumber");


--
-- Name: Client_mobileNumber_panNumber_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Client_mobileNumber_panNumber_idx" ON public."Client" USING btree ("mobileNumber", "panNumber");


--
-- Name: Client_panNumber_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "Client_panNumber_key" ON public."Client" USING btree ("panNumber");


--
-- Name: Document_clientId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Document_clientId_idx" ON public."Document" USING btree ("clientId");


--
-- Name: FAQ_audience_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "FAQ_audience_idx" ON public."FAQ" USING btree (audience);


--
-- Name: Folder_clientId_parentFolderId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Folder_clientId_parentFolderId_idx" ON public."Folder" USING btree ("clientId", "parentFolderId");


--
-- Name: HelpArticle_audience_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "HelpArticle_audience_idx" ON public."HelpArticle" USING btree (audience);


--
-- Name: Notification_clientId_createdAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Notification_clientId_createdAt_idx" ON public."Notification" USING btree ("clientId", "createdAt" DESC);


--
-- Name: Notification_recipientId_createdAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Notification_recipientId_createdAt_idx" ON public."Notification" USING btree ("recipientId", "createdAt" DESC);


--
-- Name: User_email_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "User_email_key" ON public."User" USING btree (email);


--
-- Name: ActivityLog ActivityLog_caId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ActivityLog"
    ADD CONSTRAINT "ActivityLog_caId_fkey" FOREIGN KEY ("caId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ActivityLog ActivityLog_clientId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ActivityLog"
    ADD CONSTRAINT "ActivityLog_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES public."Client"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: ActivityLog ActivityLog_docId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ActivityLog"
    ADD CONSTRAINT "ActivityLog_docId_fkey" FOREIGN KEY ("docId") REFERENCES public."Document"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: ActivityLog ActivityLog_folderId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ActivityLog"
    ADD CONSTRAINT "ActivityLog_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES public."Folder"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Banner Banner_caId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Banner"
    ADD CONSTRAINT "Banner_caId_fkey" FOREIGN KEY ("caId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Client Client_caId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Client"
    ADD CONSTRAINT "Client_caId_fkey" FOREIGN KEY ("caId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Document Document_clientId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Document"
    ADD CONSTRAINT "Document_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES public."Client"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Document Document_folderId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Document"
    ADD CONSTRAINT "Document_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES public."Folder"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Folder Folder_clientId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Folder"
    ADD CONSTRAINT "Folder_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES public."Client"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Folder Folder_parentFolderId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Folder"
    ADD CONSTRAINT "Folder_parentFolderId_fkey" FOREIGN KEY ("parentFolderId") REFERENCES public."Folder"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: LoginRequest LoginRequest_clientId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."LoginRequest"
    ADD CONSTRAINT "LoginRequest_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES public."Client"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Notification Notification_clientId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Notification"
    ADD CONSTRAINT "Notification_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES public."Client"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Notification Notification_docId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Notification"
    ADD CONSTRAINT "Notification_docId_fkey" FOREIGN KEY ("docId") REFERENCES public."Document"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Notification Notification_folderId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Notification"
    ADD CONSTRAINT "Notification_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES public."Folder"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Notification Notification_recipientId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Notification"
    ADD CONSTRAINT "Notification_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Notification Notification_senderId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Notification"
    ADD CONSTRAINT "Notification_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES public."Client"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Notification Notification_senderUserId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Notification"
    ADD CONSTRAINT "Notification_senderUserId_fkey" FOREIGN KEY ("senderUserId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- PostgreSQL database dump complete
--

\unrestrict Bo0sTd8hOukD1ebSk52Rfjyl8WxDDSTIlFOLlePqaaLEAZ5EvZuH4QxH8aq475G

