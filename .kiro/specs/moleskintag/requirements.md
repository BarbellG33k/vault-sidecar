# Requirements Document

## Introduction

vault-sidecar is a local-first, static-site digital repository built on Eleventy (11ty) that renders Markdown notes, project logs, and standalone HTML reports with the visual weight and legibility of a premium print publication. It is designed for engineers who value the organized feel of a physical journal combined with the speed and searchability of a modern web stack. The system uses a tag-driven architecture — bypassing folder hierarchies entirely — to enable fluid, multi-dimensional content discovery through file metadata.

## Glossary

- **System**: The vault-sidecar application as a whole.
- **11ty**: Eleventy, the static site generator that serves as the core build engine.
- **Index**: The left-pane navigation panel displaying a searchable, filterable list of all content items.
- **Stage**: The right-pane rendering area that displays the selected content item.
- **Ingestion_Zone**: The drag-and-drop UI component that accepts file drops for adding content to the repository.
- **Watcher**: The lightweight Node.js background process that monitors the ingestion zone and triggers 11ty rebuilds.
- **Content_Item**: A single Markdown file, project log, or standalone HTML file stored in the 11ty source folder.
- **Front_Matter**: YAML metadata embedded at the top of a Markdown file, containing fields such as title, date, and tags.
- **Tag**: A metadata label associated with a Content_Item, used for filtering and discovery.
- **Tag_Cloud**: A UI component in the Index that displays all available tags and allows filtering by tag selection.
- **Tag_Extractor**: The component responsible for deriving tags from Content_Items that lack Front_Matter.
- **HTML_Isolator**: The component responsible for rendering standalone HTML Content_Items inside the Stage without CSS bleed into the surrounding layout.
- **Collection**: An 11ty internal grouping of Content_Items, organized by tag.
- **Pretty_Printer**: The component that formats structured data back into its source representation.

---

## Requirements

### Requirement 1: Content Ingestion via Drag-and-Drop

**User Story:** As an engineer, I want to drag and drop files into the application, so that I can add content to my repository without manually managing file paths.

#### Acceptance Criteria

1. WHEN a Markdown or HTML file is dropped onto the Ingestion_Zone, THE System SHALL move the file into the 11ty source folder.
2. WHEN a file is successfully moved to the 11ty source folder, THE Watcher SHALL trigger an 11ty rebuild within 2 seconds.
3. IF a dropped file is not a Markdown or HTML file, THEN THE Ingestion_Zone SHALL display an error message identifying the unsupported file type.
4. IF a file with the same name already exists in the 11ty source folder, THEN THE System SHALL prompt the user to confirm overwrite or rename before completing the move.
5. THE Ingestion_Zone SHALL accept multiple files in a single drop operation.
6. WHILE a file move is in progress, THE Ingestion_Zone SHALL display a visual indicator of the operation status.

---

### Requirement 2: Tag-Driven Content Organization

**User Story:** As an engineer, I want all content to be organized by tags rather than folder structure, so that I can discover files across multiple dimensions without maintaining a rigid hierarchy.

#### Acceptance Criteria

1. THE System SHALL organize all Content_Items into 11ty Collections based on their Tag metadata.
2. WHEN a Content_Item contains Front_Matter with a `tags` field, THE System SHALL assign the Content_Item to the corresponding Collections.
3. WHEN a Content_Item lacks Front_Matter or has an empty `tags` field, THE Tag_Extractor SHALL derive tags for that Content_Item.
4. THE Tag_Extractor SHALL derive at least one Tag per Content_Item that lacks Front_Matter.
5. WHERE file-system metadata is available, THE Tag_Extractor SHALL use the file creation date as a fallback tag in the format `YYYY-MM`.
6. THE System SHALL update the Tag_Cloud in the Index whenever the set of available Tags changes after a rebuild.

---

### Requirement 3: Tag Extraction from Untagged Content

**User Story:** As an engineer, I want the system to automatically derive tags for files that lack front matter, so that all content remains discoverable regardless of metadata completeness.

#### Acceptance Criteria

1. WHEN a Content_Item has no Front_Matter, THE Tag_Extractor SHALL analyze the file's content to derive descriptive tags.
2. WHEN a Content_Item has no Front_Matter and no readable content, THE Tag_Extractor SHALL assign a tag derived from the file's last-modified date in the format `YYYY-MM`.
3. THE Tag_Extractor SHALL produce tags that are lowercase, hyphen-separated strings with no special characters other than hyphens.
4. FOR ALL Content_Items processed by the Tag_Extractor, parsing the extracted tags then formatting them then parsing them again SHALL produce an equivalent tag set (round-trip property).
5. IF the Tag_Extractor encounters a file it cannot read, THEN THE Tag_Extractor SHALL log the error and assign the tag `untagged` to that Content_Item.

---

### Requirement 4: Markdown Rendering in the Stage

**User Story:** As an engineer, I want Markdown files to be rendered as beautifully typeset prose in the Stage, so that my notes are legible and visually consistent with the editorial design.

#### Acceptance Criteria

1. WHEN a Markdown Content_Item is selected in the Index, THE Stage SHALL render the Markdown as HTML within the editorial layout.
2. THE Stage SHALL render standard CommonMark Markdown syntax including headings, paragraphs, lists, blockquotes, inline code, and fenced code blocks.
3. WHEN a Markdown file contains a fenced code block with a language identifier, THE Stage SHALL apply syntax highlighting to that block.
4. WHEN a Markdown file contains Front_Matter, THE Stage SHALL display the title from Front_Matter as the document heading.
5. IF a Markdown file does not contain a `title` field in its Front_Matter, THEN THE Stage SHALL derive the display title from the filename by replacing hyphens and underscores with spaces and applying title case.

---

### Requirement 5: Standalone HTML Rendering with Style Encapsulation

**User Story:** As an engineer, I want standalone HTML reports to be displayed in the Stage without their styles bleeding into the surrounding layout, so that the editorial design of the site remains intact.

#### Acceptance Criteria

1. WHEN a standalone HTML Content_Item is selected in the Index, THE HTML_Isolator SHALL render the file's content inside the Stage.
2. THE HTML_Isolator SHALL encapsulate the HTML Content_Item's styles so that they do not affect elements outside the Stage's isolation boundary.
3. THE HTML_Isolator SHALL encapsulate the surrounding layout's styles so that they do not affect elements inside the HTML Content_Item's isolation boundary.
4. WHEN a standalone HTML Content_Item contains JavaScript, THE HTML_Isolator SHALL execute that JavaScript in an isolated scope.
5. IF a standalone HTML Content_Item references external resources that cannot be loaded, THEN THE HTML_Isolator SHALL render the remaining content and log the failed resource URL.

---

### Requirement 6: The Index — Search and Navigation

**User Story:** As an engineer, I want a searchable, filterable index of all my content, so that I can quickly locate any item regardless of how many files are in the repository.

#### Acceptance Criteria

1. THE Index SHALL display all Content_Items as a flat list.
2. THE Index SHALL support toggling between a "Recent" view sorted by date descending and an "Alphabetical" view sorted by title ascending.
3. WHEN a user enters text into the search input, THE Index SHALL filter the displayed list to Content_Items whose title or tags contain the entered text.
4. WHEN a user selects a Tag in the Tag_Cloud, THE Index SHALL filter the displayed list to Content_Items associated with that Tag.
5. WHEN multiple Tags are selected in the Tag_Cloud, THE Index SHALL display only Content_Items associated with all selected Tags.
6. WHEN a user selects a Content_Item in the Index, THE Stage SHALL display that Content_Item.
7. IF the Index contains no Content_Items matching the active search or tag filter, THEN THE Index SHALL display a message indicating no results were found.

---

### Requirement 7: Editorial Design System

**User Story:** As an engineer, I want the application to have a high-contrast, editorial visual design, so that reading and navigating my content feels as refined as a premium print publication.

#### Acceptance Criteria

1. THE System SHALL apply a layout with a left Index pane and a right Stage pane at a column ratio of 1:3 or 1:4.
2. THE System SHALL use a serif typeface for headings and a sans-serif or monospaced typeface for body text.
3. THE System SHALL apply a limited color palette with high contrast between text and background.
4. THE System SHALL apply generous whitespace between content elements to maintain visual clarity.
5. WHERE a transition between content items occurs, THE System SHALL apply a subtle fade animation not exceeding 200ms in duration.
6. WHERE a tag filter is applied or removed, THE System SHALL apply a crisp transition animation not exceeding 150ms in duration.
7. THE System SHALL be responsive and maintain the 1:3 or 1:4 layout ratio on viewport widths of 1024px and above.
8. WHEN the viewport width is below 1024px, THE System SHALL collapse the Index into a toggleable overlay panel.

---

### Requirement 8: Live Local Development Environment

**User Story:** As an engineer, I want the site to automatically rebuild and reload when I add or modify content, so that I can see changes immediately without manual intervention.

#### Acceptance Criteria

1. THE Watcher SHALL monitor the 11ty source folder for file additions, modifications, and deletions.
2. WHEN the Watcher detects a file change in the 11ty source folder, THE Watcher SHALL trigger an 11ty rebuild.
3. WHEN an 11ty rebuild completes successfully, THE System SHALL reload the browser without requiring a full page refresh.
4. WHEN an 11ty rebuild fails, THE Watcher SHALL log the build error to the console and preserve the last successfully built state in the browser.
5. THE Watcher SHALL be startable and stoppable via a single CLI command.
