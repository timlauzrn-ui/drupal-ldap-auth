#!/usr/bin/env bash
# Verify department folders + media ACL.
set -euo pipefail

CONTAINER="${CONTAINER:-my-drupal}"

echo "==> Modules"
docker exec -u www-data -w /opt/drupal "${CONTAINER}" vendor/bin/drush pm:list --status=enabled --filter=department
docker exec -u www-data -w /opt/drupal "${CONTAINER}" vendor/bin/drush pm:list --status=enabled --filter=media_directories

echo "==> Folders + roles"
docker exec -u www-data -w /opt/drupal "${CONTAINER}" vendor/bin/drush php:eval '
$resolver = \Drupal::service("department_access.resolver");
$mis_tid = $resolver->getFolderTermIdForDepartment("mis");
$sus_tid = $resolver->getFolderTermIdForDepartment("sustainability");
if (!$mis_tid || !$sus_tid) { throw new \Exception("Missing department folder terms"); }
if (!\Drupal\user\Entity\Role::load("mis") || !\Drupal\user\Entity\Role::load("sustainability")) {
  throw new \Exception("Missing department roles");
}
echo "FOLDERS_OK mis=$mis_tid sustainability=$sus_tid\n";
'

echo "==> Auto-assign + ACL"
docker exec -u www-data -w /opt/drupal "${CONTAINER}" vendor/bin/drush php:eval '
use Drupal\file\Entity\File;
use Drupal\media\Entity\Media;
use Drupal\user\Entity\User;

$mis = user_load_by_name("misuser");
$sus = user_load_by_name("sususer");
if (!$mis || !$sus) { throw new \Exception("Demo users misuser/sususer missing"); }

$switcher = \Drupal::service("account_switcher");
$resolver = \Drupal::service("department_access.resolver");
$access = \Drupal::service("department_access.media_access");
$mis_tid = (int) $resolver->getFolderTermIdForDepartment("mis");
$sus_tid = (int) $resolver->getFolderTermIdForDepartment("sustainability");

function _dept_make_image_media(string $name, int $uid): Media {
  $uri = "public://dept-test-" . preg_replace("/\\W+/", "-", $name) . "-" . time() . ".txt";
  file_put_contents(\Drupal::service("file_system")->realpath("public://") . "/" . basename($uri), "test");
  $file = File::create(["uri" => $uri, "status" => 1, "uid" => $uid]);
  $file->save();
  // Prefer document bundle if image requires image file style; try image with file anyway.
  $bundle = \Drupal\media\Entity\MediaType::load("document") ? "document" : "image";
  $media = Media::create([
    "bundle" => $bundle,
    "name" => $name,
    "uid" => $uid,
    "status" => 1,
  ]);
  if ($bundle === "document" && $media->hasField("field_media_document")) {
    $media->set("field_media_document", ["target_id" => $file->id()]);
  }
  elseif ($media->hasField("field_media_image")) {
    $media->set("field_media_image", ["target_id" => $file->id(), "alt" => $name]);
  }
  return $media;
}

$switcher->switchTo($mis);
$media = _dept_make_image_media("MIS test", (int) $mis->id());
$access->assignDirectoryFromCurrentUser($media);
$assigned = (int) $media->get("directory")->target_id;
if ($assigned !== $mis_tid) {
  throw new \Exception("Expected MIS folder $mis_tid, got $assigned");
}
$media->save();
echo "AUTO_ASSIGN_OK media=" . $media->id() . " tid=$assigned\n";

if (!$access->accountMayAccessMedia($media, $mis, "view")) {
  throw new \Exception("MIS should view own media");
}
if ($access->accountMayAccessMedia($media, $sus, "view")) {
  throw new \Exception("Sustainability must NOT view MIS media");
}
echo "ACL_OK\n";
$switcher->switchBack();

$switcher->switchTo($sus);
$sus_media = _dept_make_image_media("SUS test", (int) $sus->id());
$access->assignDirectoryFromCurrentUser($sus_media);
if ((int) $sus_media->get("directory")->target_id !== $sus_tid) {
  throw new \Exception("SUS auto-assign failed");
}
$sus_media->save();
if ($access->accountMayAccessMedia($sus_media, $mis, "view")) {
  throw new \Exception("MIS must NOT view Sustainability media");
}
echo "CROSS_DEPT_ACL_OK\n";
$switcher->switchBack();
'

echo
echo "All department media checks passed."
echo "Logins: misuser/misuser (MIS), sususer/sususer (Sustainability), admin/admin"
